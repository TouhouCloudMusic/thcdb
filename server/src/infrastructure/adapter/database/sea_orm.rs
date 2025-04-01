use sea_orm::{ColumnTrait, DbErr, EntityTrait, IntoActiveModel, QueryFilter};

use crate::domain;

#[derive(Clone)]
pub struct SeaOrmRepository {
    pub conn: sea_orm::DatabaseConnection,
}

impl SeaOrmRepository {
    pub const fn new(conn: sea_orm::DatabaseConnection) -> Self {
        Self { conn }
    }
}

impl domain::repository::RepositoryTrait for SeaOrmRepository {}

impl domain::repository::image::Repository for SeaOrmRepository {
    type Error = DbErr;

    async fn create(
        &self,
        data: domain::model::image::NewImage,
    ) -> Result<entity::image::Model, Self::Error> {
        entity::image::Entity::insert(data.into_active_model())
            .exec_with_returning(&self.conn)
            .await
    }

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<entity::image::Model>, Self::Error> {
        entity::image::Entity::find()
            .filter(entity::image::Column::Filename.eq(filename))
            .one(&self.conn)
            .await
    }
}

impl domain::repository::user::ProfileRepository for SeaOrmRepository {
    type Error = DbErr;

    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<domain::model::user::UserProfile>, Self::Error> {
        use std::path::PathBuf;

        use entity::*;
        use sea_orm::DerivePartialModel;

        #[derive(DerivePartialModel)]
        #[sea_orm(entity = "user::Entity", from_query_result)]
        struct UserProfileRaw {
            pub id: i32,
            pub name: String,
            pub last_login: chrono::DateTime<chrono::FixedOffset>,
            #[sea_orm(nested)]
            pub avatar_url: Option<AvatarRaw>,
        }

        #[derive(DerivePartialModel)]
        #[sea_orm(entity = "image::Entity", from_query_result)]
        struct AvatarRaw {
            pub directory: String,
            pub filename: String,
        }

        #[derive(DerivePartialModel)]
        #[sea_orm(entity = "user_role::Entity", from_query_result)]
        struct UserRoleRaw {
            pub role_id: i32,
        }

        impl From<(UserProfileRaw, Vec<UserRoleRaw>)>
            for domain::model::user::UserProfile
        {
            fn from(
                (profile, roles): (UserProfileRaw, Vec<UserRoleRaw>),
            ) -> Self {
                Self {
                    name: profile.name,
                    last_login: profile.last_login,
                    avatar_url: profile.avatar_url.map(|a| {
                        PathBuf::from_iter([&a.directory, &a.filename])
                            .to_string_lossy()
                            .to_string()
                    }),
                    roles: roles.into_iter().map(|x| x.role_id).collect(),
                }
            }
        }

        let Some(profile) = user::Entity::find()
            .filter(user::Column::Name.eq(name))
            .left_join(entity::image::Entity)
            .into_partial_model::<UserProfileRaw>()
            .one(&self.conn)
            .await?
        else {
            return Ok(None);
        };

        let user_roles = user_role::Entity::find()
            .filter(user_role::Column::UserId.eq(profile.id))
            .into_partial_model::<UserRoleRaw>()
            .all(&self.conn)
            .await?;

        Ok(Some((profile, user_roles).into()))
    }
}
