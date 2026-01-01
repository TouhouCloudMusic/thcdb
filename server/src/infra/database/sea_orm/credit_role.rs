use entity::{
    correction_revision, credit_role, credit_role_history,
    credit_role_inheritance, credit_role_inheritance_history,
};
use sea_orm::ActiveValue::NotSet;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DbErr, EntityTrait,
    IntoActiveValue, QueryFilter, QueryOrder, Set,
};

use crate::domain::credit_role::{NewCreditRole, TxRepo};
use crate::infra::database::sea_orm::SeaOrmTxRepo;

pub(crate) async fn create_credit_role(
    data: &NewCreditRole,
    conn: &impl ConnectionTrait,
) -> Result<credit_role::Model, DbErr> {
    let credit_role_model = credit_role::ActiveModel {
        id: NotSet,
        name: data.name.to_string().into_active_value(),
        short_description: data
            .short_description
            .clone()
            .unwrap_or_default()
            .into_active_value(),
        description: data
            .description
            .clone()
            .unwrap_or_default()
            .into_active_value(),
    };

    let credit_role = credit_role_model.insert(conn).await?;

    if let Some(super_roles) = &data.super_roles && !super_roles.is_empty() {
        let inheritance_models = super_roles.iter().map(|&super_id| {
            credit_role_inheritance::ActiveModel {
                role_id: Set(credit_role.id),
                super_id: Set(super_id),
            }
        });

        credit_role_inheritance::Entity::insert_many(inheritance_models)
            .exec(conn)
            .await?;
    }

    Ok(credit_role)
}

pub(crate) async fn create_credit_role_history(
    data: &NewCreditRole,
    conn: &impl ConnectionTrait,
) -> Result<credit_role_history::Model, DbErr> {
    let credit_role_history_model = credit_role_history::ActiveModel {
        id: NotSet,
        name: data.name.to_string().into_active_value(),
        short_description: data
            .short_description
            .clone()
            .unwrap_or_default()
            .into_active_value(),
        description: data
            .description
            .clone()
            .unwrap_or_default()
            .into_active_value(),
    };

    let credit_role_history = credit_role_history_model.insert(conn).await?;

    if let Some(super_roles) = &data.super_roles && !super_roles.is_empty() {
        let inheritance_history_models =
            super_roles.iter().map(|&super_id| {
                credit_role_inheritance_history::ActiveModel {
                    history_id: Set(credit_role_history.id),
                    super_id: Set(super_id),
                }
            });

        credit_role_inheritance_history::Entity::insert_many(
            inheritance_history_models,
        )
        .exec(conn)
        .await?;
    }

    Ok(credit_role_history)
}

pub(crate) async fn apply_update_impl(
    correction: entity::correction::Model,
    conn: &impl sea_orm::ConnectionTrait,
) -> Result<(), DbErr> {
    let revision = correction_revision::Entity::find()
        .filter(correction_revision::Column::CorrectionId.eq(correction.id))
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(conn)
        .await?
        .ok_or_else(|| {
            DbErr::Custom(
                "Correction revision not found, this shouldn't happen"
                    .to_string(),
            )
        })?;

    let history =
        credit_role_history::Entity::find_by_id(revision.entity_history_id)
            .one(conn)
            .await?
            .ok_or_else(|| {
                DbErr::Custom(
                    "Credit role history not found, this shouldn't happen"
                        .to_string(),
                )
            })?;

    credit_role::ActiveModel {
        id: Set(correction.entity_id),
        name: Set(history.name),
        short_description: Set(history.short_description),
        description: Set(history.description),
    }
    .update(conn)
    .await?;

    update_credit_role_inheritance(
        correction.entity_id,
        revision.entity_history_id,
        conn,
    )
    .await?;

    Ok(())
}

impl TxRepo for SeaOrmTxRepo {
    async fn create(
        &self,
        data: &NewCreditRole,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>> {
        let credit_role = create_credit_role(data, self.conn()).await?;
        Ok(credit_role.id)
    }

    async fn create_history(
        &self,
        data: &NewCreditRole,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>> {
        let credit_role_history =
            create_credit_role_history(data, self.conn()).await?;
        Ok(credit_role_history.id)
    }

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        apply_update_impl(correction, self.conn()).await?;
        Ok(())
    }
}

async fn update_credit_role_inheritance(
    role_id: i32,
    history_id: i32,
    db: &impl sea_orm::ConnectionTrait,
) -> Result<(), DbErr> {
    // Delete existing inheritance relationships
    credit_role_inheritance::Entity::delete_many()
        .filter(credit_role_inheritance::Column::RoleId.eq(role_id))
        .exec(db)
        .await?;

    // Get inheritance relationships from history
    let inheritance_history = credit_role_inheritance_history::Entity::find()
        .filter(
            credit_role_inheritance_history::Column::HistoryId.eq(history_id),
        )
        .all(db)
        .await?;

    if inheritance_history.is_empty() {
        return Ok(());
    }

    // Recreate inheritance relationships from history
    let models = inheritance_history.into_iter().map(|inheritance| {
        credit_role_inheritance::ActiveModel {
            role_id: Set(role_id),
            super_id: Set(inheritance.super_id),
        }
    });

    credit_role_inheritance::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}
