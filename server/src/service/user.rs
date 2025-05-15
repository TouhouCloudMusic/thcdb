use std::path::PathBuf;
use std::{env, str};

use argon2::password_hash;
use axum::http::StatusCode;
use derive_more::From;
use entity::{role, user, user_role};
use error_set::error_set;
use itertools::Itertools;
use macros::{ApiError, IntoErrorSchema};
use sea_orm::ActiveValue::*;
use sea_orm::prelude::Expr;
use sea_orm::sea_query::OnConflict;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseConnection, DbErr, EntityTrait,
    IntoActiveModel, Iterable, PaginatorTrait, QueryFilter, TransactionTrait,
};

use crate::constant::ADMIN_USERNAME;
use crate::domain;
use crate::domain::image::ValidationError;
use crate::domain::model::auth::{
    HasherError, UserRoleEnum, ValidateCredsError, hash_password,
};
use crate::error::{InfraError, InvalidField, ServiceError};
use crate::model::enum_table::EnumTable;
use crate::utils::orm::PgFuncExt;

error_set! {
    #[derive(IntoErrorSchema, ApiError, From)]
    UploadAvatarError = {
        #[from(DbErr)]
        Infra(InfraError),
        #[api_error(
            status_code = StatusCode::INTERNAL_SERVER_ERROR,
            into_response = self
        )]
        Domain(domain::image::Error),
        #[api_error(
            into_response = self
        )]
        InvalidField(InvalidField),
        Validtion(ValidationError)
    };
    #[derive(ApiError, IntoErrorSchema, From)]
    CreateUserError = {
        #[display("Username already in use")]
        #[api_error(
            status_code = StatusCode::CONFLICT,
        )]
        UsernameAlreadyInUse,
        #[api_error(
            into_response = self
        )]
        #[from(password_hash::Error)]
        Hash(HasherError),
        #[api_error(
            into_response = self
        )]
        Validate(ValidateCredsError),
        #[from(DbErr)]
        Service(ServiceError),
    };
}

super::def_service!();

impl Service {
    // TODO: Move them to repository
    pub async fn find_by_id(
        &self,
        id: &i32,
    ) -> Result<Option<user::Model>, DbErr> {
        user::Entity::find()
            .filter(user::Column::Id.eq(*id))
            .one(&self.db)
            .await
    }

    pub async fn find_by_name(
        &self,
        username: &str,
    ) -> Result<Option<user::Model>, DbErr> {
        user::Entity::find()
            .filter(user::Column::Name.eq(username))
            .one(&self.db)
            .await
    }

    pub async fn get_roles(
        &self,
        user_id: i32,
    ) -> Result<Vec<role::Model>, ServiceError> {
        let res = user_role::Entity::find()
            .filter(user_role::Column::UserId.eq(user_id))
            .find_also_related(role::Entity)
            .all(&self.db)
            .await?;

        let res = res.into_iter().filter_map(|x| x.1).collect_vec();

        Ok(res)
    }
}

async fn username_in_use(
    username: &str,
    db: &impl ConnectionTrait,
) -> Result<bool, DbErr> {
    let user = user::Entity::find()
        .filter(user::Column::Name.eq(username))
        .count(db)
        .await?;

    Ok(user > 0)
}

pub async fn update_last_login(
    user_id: i32,
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    user::Entity::update_many()
        .col_expr(user::Column::LastLogin, PgFuncExt::now().into())
        .filter(user::Column::Id.eq(user_id))
        .exec(db)
        .await?;

    Ok(())
}

pub async fn upsert_admin_acc(db: &DatabaseConnection) {
    let password = hash_password(
        &env::var("ADMIN_PASSWORD").expect("Env var ADMIN_PASSWORD is not set"),
    )
    .unwrap();

    async {
        let tx = db.begin().await?;

        if username_in_use(ADMIN_USERNAME, &tx).await? {
            user::Entity::update_many()
                .col_expr(user::Column::Password, Expr::value(password))
                .filter(user::Column::Name.eq(ADMIN_USERNAME))
                .exec(&tx)
                .await?;

            return Ok(());
        }

        let res = user::Entity::insert(user::ActiveModel {
            id: NotSet,
            name: Set(ADMIN_USERNAME.to_string()),
            password: Set(password),
            avatar_id: Set(None),
            profile_banner_id: Set(None),
            last_login: Set(chrono::Local::now().into()),
            bio: Set(None),
        })
        .on_conflict(
            OnConflict::column(user::Column::Name)
                .update_columns(user::Column::iter())
                .to_owned(),
        )
        .exec_with_returning(&tx)
        .await?;

        user_role::Entity::insert(
            user_role::Model {
                user_id: res.id,
                role_id: UserRoleEnum::Admin.as_id(),
            }
            .into_active_model(),
        )
        .on_conflict_do_nothing()
        .exec(&tx)
        .await?;

        tx.commit().await
    }
    .await
    .expect("Failed to upsert admin account");
}

fn get_avatar_url(model: &entity::image::Model) -> String {
    PathBuf::from_iter([&model.directory, &model.filename])
        .to_str()
        // String from database are valid unicode so unwrap is safe
        .unwrap()
        .to_string()
}

#[cfg(test)]
mod tests {
    use chrono::DateTime;

    #[test]
    fn get_avatar_url_test() {
        let model = entity::image::Model {
            id: Default::default(),
            directory: "ab/cd".into(),
            filename: "foobar.jpg".into(),
            uploaded_by: Default::default(),
            uploaded_at: DateTime::default(),
            backend: entity::enums::StorageBackend::Fs,
        };

        assert_eq!(super::get_avatar_url(&model), "ab/cd/foobar.jpg");
    }
}
