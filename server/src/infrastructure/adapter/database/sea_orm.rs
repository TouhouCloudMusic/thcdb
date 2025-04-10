use sea_orm::{ColumnTrait, DbErr, EntityTrait, IntoActiveModel, QueryFilter};

use crate::domain::{self};
use crate::error::DbErrWrapper;

#[derive(Clone)]
pub struct SeaOrmRepository {
    pub conn: sea_orm::DatabaseConnection,
}

impl SeaOrmRepository {
    pub const fn new(conn: sea_orm::DatabaseConnection) -> Self {
        Self { conn }
    }
}

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

mod user {
    use itertools::Itertools;
    use migration::IntoCondition;
    use sea_orm::ActiveValue::Set;
    use sea_orm::{
        ActiveModelTrait, ColumnTrait, DbErr, EntityTrait, QueryFilter,
    };

    use super::SeaOrmRepository;
    use crate::domain::model::auth::UserRole;
    use crate::domain::model::user::User;
    use crate::domain::{self};
    use crate::error::DbErrWrapper;

    impl domain::repository::user::Repository for SeaOrmRepository {
        type Error = DbErrWrapper;

        async fn find_by_id(
            &self,
            id: i32,
        ) -> Result<Option<User>, Self::Error> {
            Ok(find_many_impl(entity::user::Column::Id.eq(id), &self.conn)
                .await?
                .into_iter()
                .next())
        }

        async fn find_by_name(
            &self,
            name: &str,
        ) -> Result<Option<User>, Self::Error> {
            Ok(
                find_many_impl(entity::user::Column::Name.eq(name), &self.conn)
                    .await?
                    .into_iter()
                    .next(),
            )
        }

        async fn create(&self, user: User) -> Result<User, Self::Error> {
            let model = entity::user::ActiveModel {
                name: Set(user.name),
                password: Set(user.password),
                ..Default::default()
            }
            .insert(&self.conn)
            .await?;

            let roles = user
                .roles
                .into_iter()
                .map(|role| entity::user_role::ActiveModel {
                    user_id: Set(model.id),
                    role_id: Set(role.into()),
                })
                .collect_vec();

            let roles = entity::user_role::Entity::insert_many(roles)
                .exec_with_returning_many(&self.conn)
                .await?;

            let mut user = User::from(model);

            user.roles = roles
                .into_iter()
                .map(|x| x.role_id.try_into())
                .collect::<Result<Vec<UserRole>, _>>()?;

            Ok(user)
        }
    }

    impl From<entity::user::Model> for User {
        fn from(value: entity::user::Model) -> Self {
            Self {
                id: value.id,
                name: value.name,
                password: value.password,
                avatar_id: None,
                last_login: value.last_login,
                roles: vec![],
            }
        }
    }

    async fn find_many_impl(
        filter: impl IntoCondition,
        conn: &impl sea_orm::ConnectionTrait,
    ) -> Result<Vec<User>, DbErr> {
        entity::user::Entity::find()
            .find_with_related(entity::user_role::Entity)
            .filter(filter)
            .all(conn)
            .await?
            .into_iter()
            .map(|(model, roles)| {
                let mut user = User::from(model);

                user.roles = roles
                    .into_iter()
                    .map(|x| x.role_id.try_into())
                    .collect::<Result<Vec<UserRole>, _>>()?;

                Ok(user)
            })
            .collect()
    }
}

impl domain::repository::user::ProfileRepository for SeaOrmRepository {
    type Error = DbErrWrapper;

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
