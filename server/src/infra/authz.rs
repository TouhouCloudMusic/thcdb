use std::collections::{HashMap, HashSet};

use auth_core::permission::{Permission, default_permissions};
use entity::{permission, role_permission};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseConnection, DbErr, EntityTrait,
    JoinType, QueryFilter, QuerySelect, RelationTrait, TransactionTrait,
};
use strum::IntoEnumIterator;

use crate::features::auth::UserRoleEnum;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

pub async fn sync_permissions(
    db: &DatabaseConnection,
) -> Result<(), DatabaseError> {
    let tx = db.begin().await.db_operation("begin permission sync")?;

    sync_permission_names(&tx)
        .await
        .db_operation("sync permission names")?;
    sync_role_permissions(&tx)
        .await
        .db_operation("sync role permissions")?;

    tx.commit().await.db_operation("commit permission sync")?;
    Ok(())
}

async fn sync_permission_names(db: &impl ConnectionTrait) -> Result<(), DbErr> {
    let expected_names = Permission::ALL
        .iter()
        .map(|permission| permission.as_str())
        .collect::<HashSet<_>>();

    let existing = permission::Entity::find().all(db).await?;

    let mut existing_names = HashSet::<&str>::with_capacity(existing.len());
    let mut unknown_permission_ids = Vec::<i32>::new();
    let mut unknown_permission_names = Vec::<&str>::new();

    for model in &existing {
        if !expected_names.contains(model.name.as_str()) {
            unknown_permission_ids.push(model.id);
            unknown_permission_names.push(model.name.as_str());
            continue;
        }

        existing_names.insert(model.name.as_str());
    }

    let missing_names = Permission::ALL
        .iter()
        .filter(|permission| !existing_names.contains(permission.as_str()))
        .copied()
        .collect::<Vec<_>>();

    if !missing_names.is_empty() {
        log::info!(
            target: "infra.authz",
            permissions:? = missing_names
                .iter()
                .map(|permission| permission.as_str())
                .collect::<Vec<_>>();
            "inserting missing permissions"
        );

        let missing =
            missing_names
                .iter()
                .map(|permission| permission::ActiveModel {
                    id: NotSet,
                    name: Set(permission.as_str().to_owned()),
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
    let permission_names =
        Permission::ALL.iter().map(|permission| permission.as_str());

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

        let default_permissions = default_permissions(role);
        let expected_set = default_permissions
            .iter()
            .map(|name| name.as_str())
            .collect::<HashSet<_>>();

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

        for permission_name in default_permissions {
            let permission_name = permission_name.as_str();
            if existing_set.is_some_and(|set| set.contains(permission_name)) {
                continue;
            }

            let permission_id = permission_ids
                .get(permission_name)
                .copied()
                .expect("permission exists after permission sync");

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
    let names = Permission::ALL.iter().map(|permission| permission.as_str());

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
