use std::env;

use entity::{user, user_role};
use infra_db::lookup_table::ValidateLookupTable;
use sea_orm::ActiveValue::*;
use sea_orm::prelude::Expr;
use sea_orm::{
    ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, QueryFilter,
    TransactionTrait,
};

use crate::constant::ADMIN_USERNAME;
use crate::features::auth::UserRoleEnum;
use crate::infra::authz::sync_permissions;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::secret::hash;

pub(crate) async fn sync_startup_data(
    db: &DatabaseConnection,
) -> Result<(), DatabaseError> {
    UserRoleEnum::check_and_sync(db)
        .await
        .db_operation("sync user role lookup table")?;
    sync_permissions(db).await?;

    upsert_admin_acc(db).await;

    Ok(())
}

async fn upsert_admin_acc(db: &DatabaseConnection) {
    let admin_password = env::var("ADMIN_PASSWORD")
        .unwrap_or_else(|_| admin_password_fallback());
    let password = hash(&admin_password)
        .await
        .expect("Failed to hash ADMIN_PASSWORD");
    let admin_email = env::var("ADMIN_EMAIL")
        .ok()
        .map(|v| v.trim().to_lowercase())
        .filter(|v| !v.is_empty());
    let admin_email_placeholder = "admin@localhost".to_string();

    async {
        let tx = db.begin().await?;

        let admin_user = user::Entity::find()
            .filter(user::Column::Name.eq(ADMIN_USERNAME))
            .one(&tx)
            .await?;

        let admin_id = if let Some(admin_user) = admin_user {
            let mut update = user::Entity::update_many()
                .col_expr(user::Column::Password, Expr::value(password.clone()))
                .col_expr(user::Column::EmailVerified, Expr::value(true))
                .filter(user::Column::Id.eq(admin_user.id));

            if let Some(admin_email) = &admin_email {
                update = update.col_expr(
                    user::Column::Email,
                    Expr::value(admin_email.clone()),
                );
            }

            update.exec(&tx).await?;

            admin_user.id
        } else {
            let admin_email = admin_email
                .clone()
                .unwrap_or_else(|| admin_email_placeholder.clone());

            let res = user::Entity::insert(user::ActiveModel {
                id: NotSet,
                name: Set(ADMIN_USERNAME.to_string()),
                email: Set(admin_email),
                email_verified: Set(true),
                password: Set(password),
                avatar_id: Set(None),
                profile_banner_id: Set(None),
                last_login: Set(chrono::Local::now().into()),
                created_at: NotSet,
                bio: Set(None),
                settings: NotSet,
            })
            .exec_with_returning(&tx)
            .await?;

            res.id
        };

        user_role::Entity::insert(
            user_role::Model {
                user_id: admin_id,
                role_id: UserRoleEnum::Admin.into(),
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

fn admin_password_fallback() -> String {
    #[cfg(test)]
    {
        "changeme".to_string()
    }

    #[cfg(not(test))]
    {
        panic!("Env var ADMIN_PASSWORD is not set");
    }
}
