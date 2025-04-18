use std::path::PathBuf;

use entity::relation::UserRelationExt;
use entity::{user_following, user_role};
use field_types::FieldName;
use itertools::Itertools;
use sea_orm::prelude::Expr;
use sea_orm::sea_query::Alias;
use sea_orm::{
    ColumnTrait, DbErr, EntityTrait, FromQueryResult, IntoActiveModel,
    JoinType, PaginatorTrait, QueryFilter, QuerySelect, QueryTrait,
    RelationTrait,
};

use crate::domain::model::auth::UserRoleEnum;
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
    type Error = DbErrWrapper;

    async fn create(
        &self,
        data: domain::model::image::NewImage,
    ) -> Result<entity::image::Model, Self::Error> {
        Ok(entity::image::Entity::insert(data.into_active_model())
            .exec_with_returning(&self.conn)
            .await?)
    }

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<entity::image::Model>, Self::Error> {
        Ok(entity::image::Entity::find()
            .filter(entity::image::Column::Filename.eq(filename))
            .one(&self.conn)
            .await?)
    }
}

mod user {
    use itertools::Itertools;
    use sea_orm::ActiveValue::{NotSet, Set};
    use sea_orm::sea_query::IntoCondition;
    use sea_orm::{
        ColumnTrait, DbErr, EntityTrait, Iterable, QueryFilter,
        TransactionTrait,
    };
    use sea_orm_migration::prelude::OnConflict;

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

        async fn save(&self, user: User) -> Result<User, Self::Error> {
            let tx = self.conn.begin().await?;
            let model =
                entity::user::Entity::insert(entity::user::ActiveModel {
                    id: if user.id > 0 { Set(user.id) } else { NotSet },
                    name: Set(user.name),
                    password: Set(user.password),
                    avatar_id: Set(user.avatar_id),
                    profile_banner_id: Set(user.profile_banner_id),
                    last_login: Set(user.last_login),
                })
                .on_conflict(
                    OnConflict::column(entity::user::Column::Id)
                        .update_columns(entity::user::Column::iter())
                        .to_owned(),
                )
                .exec_with_returning(&tx)
                .await?;

            let roles = user
                .roles
                .into_iter()
                .map(|role| entity::user_role::ActiveModel {
                    user_id: Set(model.id),
                    role_id: Set(role.id),
                })
                .collect_vec();

            entity::user_role::Entity::delete_many()
                .filter(entity::user_role::Column::UserId.eq(model.id))
                .exec(&tx)
                .await?;

            let roles = entity::user_role::Entity::insert_many(roles)
                .exec_with_returning_many(&tx)
                .await?;

            let mut user = User::from(model);

            user.roles = roles
                .into_iter()
                .map(TryInto::try_into)
                .collect::<Result<Vec<UserRole>, _>>()?;

            tx.commit().await?;

            Ok(user)
        }
    }

    impl From<entity::user::Model> for User {
        fn from(value: entity::user::Model) -> Self {
            Self {
                id: value.id,
                name: value.name,
                password: value.password,
                avatar_id: value.avatar_id,
                profile_banner_id: value.profile_banner_id,
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
                    .map(TryInto::try_into)
                    .collect::<Result<Vec<UserRole>, _>>()?;

                Ok(user)
            })
            .collect()
    }
}

impl TryFrom<user_role::Model> for UserRoleEnum {
    type Error = DbErr;

    fn try_from(value: user_role::Model) -> Result<Self, Self::Error> {
        Self::try_from(value.role_id)
    }
}

impl domain::repository::user::ProfileRepository for SeaOrmRepository {
    type Error = DbErrWrapper;

    #[expect(clippy::too_many_lines)]
    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<domain::model::user::UserProfile>, Self::Error> {
        use entity::*;

        const AVATAR_ALIAS: &str = "a";

        const BANNER_ALIAS: &str = "b";

        #[derive(FromQueryResult, FieldName)]
        #[sea_orm(entity = "user::Entity", from_query_result)]
        struct UserProfileRaw {
            pub id: i32,
            pub name: String,
            pub last_login: chrono::DateTime<chrono::FixedOffset>,

            pub avatar_url_dir: Option<String>,
            pub avatar_url_filename: Option<String>,

            pub banner_url_dir: Option<String>,
            pub banner_url_file: Option<String>,
        }

        impl TryFrom<(UserProfileRaw, Vec<user_role::Model>)>
            for domain::model::user::UserProfile
        {
            type Error = DbErr;

            fn try_from(
                (profile, roles): (UserProfileRaw, Vec<user_role::Model>),
            ) -> Result<Self, Self::Error> {
                let avatar_url = if let Some(dir) = profile.avatar_url_dir
                    && let Some(filename) = profile.avatar_url_filename
                {
                    Some(
                        PathBuf::from(dir)
                            .join(filename)
                            .to_string_lossy()
                            .to_string(),
                    )
                } else {
                    None
                };

                let banner_url = if let Some(dir) = profile.banner_url_dir
                    && let Some(filename) = profile.banner_url_file
                {
                    Some(
                        PathBuf::from(dir)
                            .join(filename)
                            .to_string_lossy()
                            .to_string(),
                    )
                } else {
                    None
                };

                Ok(Self {
                    name: profile.name,
                    last_login: profile.last_login,
                    avatar_url,
                    banner_url,
                    roles: roles
                        .into_iter()
                        .map(TryInto::try_into)
                        .try_collect()?,
                    is_following: None,
                })
            }
        }

        let avatar_alias = Alias::new(AVATAR_ALIAS);
        let banner_alias = Alias::new(BANNER_ALIAS);

        let Some(profile) = user::Entity::find()
            .filter(user::Column::Name.eq(name))
            .join_as(
                JoinType::LeftJoin,
                UserRelationExt::Avatar.def(),
                avatar_alias.clone(),
            )
            .join_as(
                JoinType::LeftJoin,
                UserRelationExt::ProfileBanner.def(),
                banner_alias.clone(),
            )
            .select_only()
            .column(user::Column::Id)
            .column(user::Column::Name)
            .column(user::Column::LastLogin)
            .column_as(
                Expr::col((avatar_alias.clone(), image::Column::Directory)),
                UserProfileRawFieldName::AvatarUrlDir.name(),
            )
            .column_as(
                Expr::col((avatar_alias.clone(), image::Column::Filename)),
                UserProfileRawFieldName::AvatarUrlFilename.name(),
            )
            .column_as(
                Expr::col((banner_alias.clone(), image::Column::Directory)),
                UserProfileRawFieldName::BannerUrlDir.name(),
            )
            .column_as(
                Expr::col((banner_alias.clone(), image::Column::Filename)),
                UserProfileRawFieldName::BannerUrlFile.name(),
            )
            .into_model::<UserProfileRaw>()
            .one(&self.conn)
            .await?
        else {
            return Ok(None);
        };

        let user_roles = user_role::Entity::find()
            .column(user_role::Column::RoleId)
            .filter(user_role::Column::UserId.eq(profile.id))
            .all(&self.conn)
            .await?;

        Ok(Some((profile, user_roles).try_into()?))
    }

    async fn with_following(
        &self,
        profile: &mut domain::model::user::UserProfile,
        current_user: &domain::model::user::User,
    ) -> Result<(), Self::Error> {
        if profile.name == current_user.name {
            return Ok(());
        }

        let sub_query = entity::user::Entity::find()
            .select_only()
            .column(entity::user::Column::Id)
            .filter(entity::user::Column::Name.eq(&profile.name))
            .into_query();

        let res = user_following::Entity::find()
            .filter(user_following::Column::UserId.eq(current_user.id))
            .filter(user_following::Column::FollowingId.in_subquery(sub_query))
            .count(&self.conn)
            .await?;

        profile.is_following = Some(res > 0);

        Ok(())
    }
}
