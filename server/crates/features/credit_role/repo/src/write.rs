use domain::shared::EntityIdent;
use entity::{
    credit_role, credit_role_history, credit_role_inheritance,
    credit_role_inheritance_history,
};
use infra_db::DatabaseTransaction;
use infra_db::error::DatabaseError;
use sea_orm::ActiveValue::NotSet;
use sea_orm::{ActiveModelTrait, DbErr, EntityTrait, IntoActiveValue, Set};
use serde::Deserialize;
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct NewCreditRole {
    pub name: EntityIdent,
    pub short_description: Option<String>,
    pub description: Option<String>,
    pub super_roles: Option<Vec<i32>>,
}

async fn create_credit_role(
    data: &NewCreditRole,
    tx: &DatabaseTransaction,
) -> Result<credit_role::Model, DbErr> {
    infra_db::trace("credit_role.insert_with_inheritance", async {
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

        let credit_role = credit_role_model.insert(tx).await?;

        if let Some(super_roles) = &data.super_roles
            && !super_roles.is_empty()
        {
            let inheritance_models = super_roles.iter().map(|&super_id| {
                credit_role_inheritance::ActiveModel {
                    role_id: Set(credit_role.id),
                    super_id: Set(super_id),
                }
            });

            credit_role_inheritance::Entity::insert_many(inheritance_models)
                .exec(tx)
                .await?;
        }

        Ok(credit_role)
    })
    .await
}

async fn create_credit_role_history(
    data: &NewCreditRole,
    tx: &DatabaseTransaction,
) -> Result<credit_role_history::Model, DbErr> {
    infra_db::trace("credit_role.insert_history_with_inheritance", async {
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

        let credit_role_history = credit_role_history_model.insert(tx).await?;

        if let Some(super_roles) = &data.super_roles
            && !super_roles.is_empty()
        {
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
            .exec(tx)
            .await?;
        }

        Ok(credit_role_history)
    })
    .await
}

/// Inserts the current credit role in the caller's transaction.
#[infra_db::observe("credit_role.create")]
pub async fn create(
    tx: &DatabaseTransaction,
    data: &NewCreditRole,
) -> Result<i32, DatabaseError> {
    Ok(create_credit_role(data, tx).await.map(|role| role.id)?)
}

/// Inserts a credit role snapshot in the caller's transaction.
#[infra_db::observe("credit_role.create_history")]
pub async fn create_history(
    tx: &DatabaseTransaction,
    data: &NewCreditRole,
) -> Result<i32, DatabaseError> {
    Ok(create_credit_role_history(data, tx)
        .await
        .map(|role| role.id)?)
}
