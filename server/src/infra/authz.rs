use std::collections::{HashMap, HashSet};

use entity::{permission, role_permission, user_role};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseConnection, DbErr, EntityTrait,
    JoinType, QueryFilter, QuerySelect, RelationTrait, TransactionTrait,
};
use strum::IntoEnumIterator;

use crate::domain::model::{PermissionDef, PermissionMarker, UserRoleEnum};

pub async fn sync_permissions(db: &DatabaseConnection) -> Result<(), DbErr> {
    let tx = db.begin().await?;

    sync_permission_defs(&tx).await?;
    sync_role_permissions(&tx).await?;

    tx.commit().await?;
    Ok(())
}

async fn sync_permission_defs(db: &impl ConnectionTrait) -> Result<(), DbErr> {
    let expected = PermissionDef::ALL;
    let expected_by_name = expected
        .iter()
        .map(|def| (def.name, *def))
        .collect::<HashMap<_, _>>();

    let existing = permission::Entity::find().all(db).await?;

    let mut existing_names = HashSet::<&str>::with_capacity(existing.len());
    let mut unknown_permission_ids = Vec::<i32>::new();
    let mut unknown_permission_names = Vec::<&str>::new();

    for model in &existing {
        let Some(expected_def) = expected_by_name.get(model.name.as_str())
        else {
            unknown_permission_ids.push(model.id);
            unknown_permission_names.push(model.name.as_str());
            continue;
        };

        existing_names.insert(model.name.as_str());

        let db_desc = model.description.as_deref();
        let code_desc = expected_def.description;
        if db_desc != code_desc {
            log::info!(
                target: "infra.authz",
                permission = model.name.as_str(),
                db_description:? = db_desc,
                code_description:? = code_desc;
                "updating permission description"
            );

            permission::Entity::update_many()
                .col_expr(
                    permission::Column::Description,
                    sea_orm::sea_query::Expr::value(
                        code_desc.map(str::to_owned),
                    ),
                )
                .filter(permission::Column::Id.eq(model.id))
                .exec(db)
                .await?;
        }
    }

    let missing_names = expected
        .iter()
        .filter(|def| !existing_names.contains(def.name))
        .map(|def| def.name)
        .collect::<Vec<_>>();

    if !missing_names.is_empty() {
        log::info!(
            target: "infra.authz",
            permissions:? = missing_names;
            "inserting missing permissions"
        );

        let missing = missing_names
            .iter()
            .filter_map(|name| expected_by_name.get(name).copied())
            .map(|def| permission::ActiveModel {
                id: NotSet,
                name: Set(def.name.to_owned()),
                description: Set(def.description.map(str::to_owned)),
            });

        permission::Entity::insert_many(missing)
            .exec_without_returning(db)
            .await?;
    }

    if !unknown_permission_ids.is_empty() {
        log::warn!(
            target: "infra.authz",
            permissions:? = unknown_permission_names;
            "deleting unknown permissions"
        );

        let deleted_role_permissions = role_permission::Entity::delete_many()
            .filter(
                role_permission::Column::PermissionId
                    .is_in(unknown_permission_ids.iter().copied()),
            )
            .exec(db)
            .await?;

        let deleted_permissions = permission::Entity::delete_many()
            .filter(
                permission::Column::Id
                    .is_in(unknown_permission_ids.iter().copied()),
            )
            .exec_with_returning(db)
            .await?;

        log::warn!(
            target: "infra.authz",
            role_permissions_deleted = deleted_role_permissions.rows_affected,
            permissions_deleted = deleted_permissions.len(),
            permissions:? = deleted_permissions
                .iter()
                .map(|m| &m.name)
                .collect::<Vec<_>>();
            "deleted unknown permissions"
        );
    }

    Ok(())
}

async fn sync_role_permissions(db: &impl ConnectionTrait) -> Result<(), DbErr> {
    let permission_ids = permission_fetch_id_map(db).await?;

    let role_ids = UserRoleEnum::iter().map(i32::from).collect::<Vec<_>>();
    let permission_names = PermissionDef::ALL.iter().map(|def| def.name);

    let existing = role_permission::Entity::find()
        .select_only()
        .column(role_permission::Column::RoleId)
        .column(permission::Column::Name)
        .join(
            JoinType::InnerJoin,
            role_permission::Relation::Permission.def(),
        )
        .filter(role_permission::Column::RoleId.is_in(role_ids))
        .filter(permission::Column::Name.is_in(permission_names))
        .into_tuple::<(i32, String)>()
        .all(db)
        .await?;

    let mut existing_by_role = HashMap::<_, HashSet<_>>::new();
    for (role_id, permission_name) in &existing {
        existing_by_role
            .entry(*role_id)
            .or_default()
            .insert(permission_name.as_str());
    }

    let mut mappings = Vec::new();
    for role in UserRoleEnum::iter() {
        let role_id: i32 = role.into();

        let default_permissions = role.default_permissions();
        let expected_set =
            default_permissions.iter().copied().collect::<HashSet<_>>();

        let existing_set = existing_by_role.get(&role_id);

        let extra = existing_set
            .iter()
            .flat_map(|set| set.iter())
            .filter(|name| !expected_set.contains(*name))
            .copied()
            .collect::<Vec<_>>();
        if !extra.is_empty() {
            let extra = extra.join(", ");
            panic!(
                "Role permission mapping conflicts with database records.\n\
                Role: '{role}'\n\
                Unexpected permissions: [{extra}]"
            );
        }

        for &permission_name in default_permissions {
            if existing_set.is_some_and(|set| set.contains(permission_name)) {
                continue;
            }

            let permission_id = permission_ids
                .get(permission_name)
                .copied()
                .ok_or_else(|| {
                    DbErr::Custom(format!(
                        "Permission not found after sync: {permission_name}"
                    ))
                })?;

            mappings.push(role_permission::ActiveModel {
                role_id: Set(role_id),
                permission_id: Set(permission_id),
            });
        }
    }

    if mappings.is_empty() {
        return Ok(());
    }

    role_permission::Entity::insert_many(mappings)
        .exec_without_returning(db)
        .await?;

    Ok(())
}

async fn permission_fetch_id_map(
    db: &impl ConnectionTrait,
) -> Result<HashMap<String, i32>, DbErr> {
    let names = PermissionDef::ALL.iter().map(|def| def.name);

    let models = permission::Entity::find()
        .select_only()
        .column(permission::Column::Id)
        .column(permission::Column::Name)
        .filter(permission::Column::Name.is_in(names))
        .into_tuple::<(i32, String)>()
        .all(db)
        .await?;

    Ok(models.into_iter().map(|(id, name)| (name, id)).collect())
}

pub async fn user_has_permission<P>(
    db: &impl ConnectionTrait,
    user_id: i32,
) -> Result<bool, DbErr>
where
    P: PermissionMarker,
{
    // TODO: Replace this with exists after update sea orm to 2.0
    let exists = user_role::Entity::find()
        .select_only()
        .expr(1)
        .filter(user_role::Column::UserId.eq(user_id))
        .join(JoinType::InnerJoin, user_role::Relation::Role.def())
        .join(
            JoinType::InnerJoin,
            role_permission::Relation::Role.def().rev(),
        )
        .join(
            JoinType::InnerJoin,
            role_permission::Relation::Permission.def(),
        )
        .filter(permission::Column::Name.eq(P::NAME))
        .limit(1)
        .into_tuple::<(i32,)>()
        .one(db)
        .await?;
    Ok(exists.is_some())
}
