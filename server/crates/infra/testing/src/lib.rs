use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use entity::{role, user, user_role};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ConnectionTrait, DatabaseConnection, DbErr, EntityTrait, IntoActiveModel,
};
use sea_query::OnConflict;

pub mod password_reset;

static FIXTURE_SUFFIX: AtomicU64 = AtomicU64::new(1);

#[must_use]
pub fn test_database_url() -> String {
    std::env::var("TEST_DATABASE_URL").ok().unwrap_or_else(|| {
        let port = std::env::var("TEST_DB_PORT")
            .unwrap_or_else(|_| "55432".to_string());
        format!("postgres://testuser:testpass@127.0.0.1:{port}/testdb")
    })
}

#[must_use]
pub fn test_redis_url() -> String {
    std::env::var("TEST_REDIS_URL").ok().unwrap_or_else(|| {
        let port = std::env::var("TEST_REDIS_PORT")
            .unwrap_or_else(|_| "56379".to_string());
        format!("redis://127.0.0.1:{port}")
    })
}

static MIGRATIONS: tokio::sync::OnceCell<()> =
    tokio::sync::OnceCell::const_new();

pub async fn test_connection() -> DatabaseConnection {
    MIGRATIONS
        .get_or_init(|| async {
            let conn = infra_db::get_connection(&test_database_url()).await;
            infra_db::run_migrations(&conn).await;
        })
        .await;
    let conn = infra_db::get_connection(&test_database_url()).await;
    sync_roles(&conn).await.unwrap();
    conn
}

async fn sync_roles(conn: &DatabaseConnection) -> Result<(), DbErr> {
    role::Entity::insert_many([
        role::ActiveModel {
            id: Set(1),
            name: Set("Admin".to_string()),
        },
        role::ActiveModel {
            id: Set(2),
            name: Set("Moderator".to_string()),
        },
        role::ActiveModel {
            id: Set(3),
            name: Set("User".to_string()),
        },
    ])
    .on_conflict(OnConflict::column(role::Column::Id).do_nothing().to_owned())
    .exec_without_returning(conn)
    .await?;

    Ok(())
}

#[derive(Clone, Debug)]
pub struct MockUser {
    pub label: String,
    pub suffix: u64,
    pub password: String,
}

impl MockUser {
    pub fn with_label(label: impl Into<String>) -> Self {
        let time_suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_or(0, |duration| duration.as_nanos());
        let counter_suffix = FIXTURE_SUFFIX.fetch_add(1, Ordering::Relaxed);

        Self {
            label: label.into(),
            suffix: u64::try_from(time_suffix).unwrap_or(u64::MAX)
                ^ counter_suffix,
            password: "password".to_string(),
        }
    }

    pub async fn insert(
        self,
        conn: &impl ConnectionTrait,
    ) -> Result<user::Model, DbErr> {
        let user = user::Entity::insert(self.into_active_model())
            .exec_with_returning(conn)
            .await?;

        user_role::Entity::insert(user_role::ActiveModel {
            user_id: Set(user.id),
            role_id: Set(3),
        })
        .exec(conn)
        .await?;

        Ok(user)
    }
}

impl IntoActiveModel<user::ActiveModel> for MockUser {
    fn into_active_model(self) -> user::ActiveModel {
        let name = format!("{}_{}", self.label, self.suffix);
        let email = format!("{name}@example.com");

        user::ActiveModel {
            id: NotSet,
            name: Set(name),
            email: Set(email),
            email_verified: Set(true),
            password: Set(self.password),
            avatar_id: Set(None),
            last_login: NotSet,
            created_at: NotSet,
            profile_banner_id: Set(None),
            bio: Set(None),
            settings: Set(serde_json::json!({})),
        }
    }
}
