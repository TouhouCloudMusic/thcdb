use entity::{
    correction_revision, credit_role, credit_role_history,
    credit_role_inheritance, credit_role_inheritance_history,
};
use sea_orm::ActiveValue::NotSet;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbErr, EntityTrait, IntoActiveValue,
    QueryFilter, QueryOrder, Set,
};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{ExprTrait, Func};

use crate::domain::credit_role::repo::{
    CommonFilter, FindManyFilter, QueryKind,
};
use crate::domain::credit_role::{NewCreditRole, Repo, TxRepo};
use crate::domain::repository::Connection;
use crate::infra::database::sea_orm::SeaOrmTxRepo;

impl<T> Repo for T
where
    T: Connection<Error = DbErr>,
    T::Conn: sea_orm::ConnectionTrait,
{
    async fn find_one<K: QueryKind>(
        &self,
        id: i32,
        _common: CommonFilter,
    ) -> Result<Option<K::Output>, Self::Error> {
        let role = credit_role::Entity::find_by_id(id).one(self.conn()).await?;

        Ok(role.map(Into::into))
    }

    async fn find_many<K: QueryKind>(
        &self,
        filter: FindManyFilter,
        _common: CommonFilter,
    ) -> Result<Vec<K::Output>, Self::Error> {
        let roles = match filter {
            FindManyFilter::Name(name) => {
                let search_term = Func::lower(name);

                credit_role::Entity::find()
                    .filter(
                        Func::lower(credit_role::Column::Name.into_expr())
                            .binary(PgBinOper::Similarity, search_term.clone()),
                    )
                    .order_by_asc(
                        Func::lower(credit_role::Column::Name.into_expr())
                            .binary(PgBinOper::SimilarityDistance, search_term),
                    )
                    .all(self.conn())
                    .await?
            }
        };

        Ok(roles.into_iter().map(Into::into).collect())
    }
}

impl TxRepo for SeaOrmTxRepo {
    async fn create(&self, data: &NewCreditRole) -> Result<i32, Self::Error> {
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

        let credit_role = credit_role_model.insert(self.conn()).await?;

        // Handle inheritance relationships
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
                .exec(self.conn())
                .await?;
        }

        Ok(credit_role.id)
    }

    async fn create_history(
        &self,
        data: &NewCreditRole,
    ) -> Result<i32, Self::Error> {
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

        let credit_role_history =
            credit_role_history_model.insert(self.conn()).await?;

        // Handle inheritance relationships in history
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
            .exec(self.conn())
            .await?;
        }

        Ok(credit_role_history.id)
    }

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Self::Error> {
        // Get the latest correction revision
        let revision = correction_revision::Entity::find()
            .filter(correction_revision::Column::CorrectionId.eq(correction.id))
            .order_by_desc(correction_revision::Column::EntityHistoryId)
            .one(self.conn())
            .await?
            .expect("Correction revision not found, this shouldn't happen");

        // Get the credit role history record
        let history =
            credit_role_history::Entity::find_by_id(revision.entity_history_id)
                .one(self.conn())
                .await?
                .expect("Credit role history not found, this shouldn't happen");

        // Update main credit_role table with history data
        credit_role::ActiveModel {
            id: Set(correction.entity_id),
            name: Set(history.name),
            short_description: Set(history.short_description),
            description: Set(history.description),
        }
        .update(self.conn())
        .await?;

        // Update credit_role_inheritance relationships using delete+recreate pattern
        update_credit_role_inheritance(
            correction.entity_id,
            revision.entity_history_id,
            self.conn(),
        )
        .await?;

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
