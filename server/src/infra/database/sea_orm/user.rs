use std::path::PathBuf;

use entity::enums::{CorrectionStatus, CorrectionType, CorrectionUserType};
use entity::relation::UserRelationExt;
use entity::user::ActiveModel;
use entity::user_following;
use itertools::Itertools;
use macros::FieldEnum;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::prelude::Expr;
use sea_orm::sea_query::{Func, IntoCondition, Query, SimpleExpr, UnionType};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, FromQueryResult,
    IntoActiveModel, JoinType, PaginatorTrait, QueryFilter, QuerySelect,
    QueryTrait, RelationTrait, TransactionTrait,
};
use sea_orm_migration::prelude::Alias;

use super::{SeaOrmRepository, SeaOrmTxRepo};
use crate::domain;
use crate::domain::model::UserRoleEnum;
use crate::domain::user::{
    NewUser, User, UserProfile, UserProfileStats, {self},
};

impl user::Repository for SeaOrmRepository {
    async fn find_by_id(
        &self,
        id: i32,
    ) -> Result<Option<User>, Box<dyn std::error::Error + Send + Sync>> {
        Ok(find_many_impl(entity::user::Column::Id.eq(id), &self.conn)
            .await?
            .into_iter()
            .next())
    }

    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<User>, Box<dyn std::error::Error + Send + Sync>> {
        Ok(
            find_many_impl(entity::user::Column::Name.eq(name), &self.conn)
                .await?
                .into_iter()
                .next(),
        )
    }
}

impl user::TxRepo for SeaOrmTxRepo {
    async fn create(
        &self,
        user: NewUser,
    ) -> Result<User, Box<dyn std::error::Error + Send + Sync>> {
        let tx = self.conn().begin().await?;

        let model = entity::user::Entity::insert(user.into_active_model())
            .exec_with_returning(&tx)
            .await?;

        entity::user_role::Entity::insert(entity::user_role::ActiveModel {
            user_id: Set(model.id),
            role_id: Set(UserRoleEnum::User.into()),
        })
        .exec(&tx)
        .await?;

        let mut user = User::from(model);

        user.roles = vec![UserRoleEnum::User.into()];

        tx.commit().await?;

        Ok(user)
    }

    async fn update(
        &self,
        user: User,
    ) -> Result<User, Box<dyn std::error::Error + Send + Sync>> {
        let tx = self.conn();
        let user_roles = user.roles.clone();
        let model = entity::user::Entity::update(user.into_active_model())
            .exec(tx)
            .await?;

        let roles = user_roles
            .into_iter()
            .map(|role| entity::user_role::ActiveModel {
                user_id: Set(model.id),
                role_id: Set(role.id),
            })
            .collect_vec();

        entity::user_role::Entity::delete_many()
            .filter(entity::user_role::Column::UserId.eq(model.id))
            .exec(tx)
            .await?;

        let roles = entity::user_role::Entity::insert_many(roles)
            .exec_with_returning_many(tx)
            .await?;

        let mut user = User::from(model);

        user.roles = roles.into_iter().map(TryInto::try_into).try_collect()?;

        Ok(user)
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

            user.roles =
                roles.into_iter().map(TryInto::try_into).try_collect()?;

            Ok(user)
        })
        .collect()
}

impl From<entity::user::Model> for User {
    fn from(value: entity::user::Model) -> Self {
        Self {
            id: value.id,
            name: value.name,
            email: value.email,
            email_verified: value.email_verified,
            password: value.password,
            email_verification: None,
            avatar_id: value.avatar_id,
            profile_banner_id: value.profile_banner_id,
            last_login: value.last_login,
            created_at: value.created_at,
            roles: vec![],
            bio: value.bio,
            settings: value.settings,
        }
    }
}

impl IntoActiveModel<ActiveModel> for User {
    fn into_active_model(self) -> ActiveModel {
        ActiveModel {
            id: Set(self.id),
            name: Set(self.name),
            email: Set(self.email),
            email_verified: Set(self.email_verified),
            password: Set(self.password),
            avatar_id: Set(self.avatar_id),
            last_login: Set(self.last_login),
            created_at: Set(self.created_at),
            profile_banner_id: Set(self.profile_banner_id),
            bio: Set(self.bio),
            settings: Set(self.settings),
        }
    }
}

impl From<NewUser> for ActiveModel {
    fn from(val: NewUser) -> Self {
        Self {
            id: NotSet,
            name: Set(val.name),
            email: Set(val.email),
            email_verified: Set(val.email_verified),
            password: Set(val.password),
            avatar_id: NotSet,
            last_login: NotSet,
            created_at: NotSet,
            profile_banner_id: NotSet,
            bio: NotSet,
            settings: NotSet,
        }
    }
}

impl IntoActiveModel<ActiveModel> for NewUser {
    fn into_active_model(self) -> ActiveModel {
        self.into()
    }
}

impl user::ProfileRepository for SeaOrmRepository {
    #[expect(clippy::too_many_lines)]
    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<UserProfile>, Box<dyn std::error::Error + Send + Sync>>
    {
        use entity::*;

        const AVATAR_ALIAS: &str = "a";

        const BANNER_ALIAS: &str = "b";

        #[derive(FromQueryResult, FieldEnum)]
        #[sea_orm(entity = "user::Entity", from_query_result)]
        struct UserProfileRaw {
            pub id: i32,
            pub name: String,
            pub last_login: chrono::DateTime<chrono::FixedOffset>,
            pub bio: Option<String>,

            pub avatar_url_dir: Option<String>,
            pub avatar_url_filename: Option<String>,

            pub banner_url_dir: Option<String>,
            pub banner_url_file: Option<String>,
        }

        impl sea_orm::IntoIdentity for UserProfileRawFieldName {
            fn into_identity(self) -> sea_orm::Identity {
                self.as_str().into_identity()
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
            .column(user::Column::Bio)
            .column_as(
                Expr::col((avatar_alias.clone(), image::Column::Directory)),
                UserProfileRawFieldName::AvatarUrlDir,
            )
            .column_as(
                Expr::col((avatar_alias.clone(), image::Column::Filename)),
                UserProfileRawFieldName::AvatarUrlFilename,
            )
            .column_as(
                Expr::col((banner_alias.clone(), image::Column::Directory)),
                UserProfileRawFieldName::BannerUrlDir,
            )
            .column_as(
                Expr::col((banner_alias.clone(), image::Column::Filename)),
                UserProfileRawFieldName::BannerUrlFile,
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
        let stats = find_profile_stats(profile.id, &self.conn).await?;

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

        Ok(Some(UserProfile {
            name: profile.name,
            last_login: profile.last_login,
            avatar_url,
            banner_url,
            roles: user_roles
                .into_iter()
                .map(TryInto::try_into)
                .try_collect()?,
            is_following: None,
            bio: profile.bio,
            stats,
            settings: None,
        }))
    }

    async fn with_following(
        &self,
        profile: &mut UserProfile,
        current_user: &domain::user::User,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if profile.name == current_user.name {
            return Ok(());
        }

        let sub_query = entity::user::Entity::find()
            .select_only()
            .column(entity::user::Column::Id)
            .filter(entity::user::Column::Name.eq(&profile.name))
            .into_query();

        let res = user_following::Entity::find()
            .select_only()
            .column(user_following::Column::FollowingId)
            .filter(user_following::Column::UserId.eq(current_user.id))
            .filter(user_following::Column::FollowingId.in_subquery(sub_query))
            .count(&self.conn)
            .await?;

        profile.is_following = Some(res > 0);

        Ok(())
    }
}

async fn find_profile_stats(
    user_id: i32,
    conn: &impl ConnectionTrait,
) -> Result<UserProfileStats, DbErr> {
    use entity::{
        artist_tag_vote, correction, correction_user, release_tag_vote,
        song_tag_vote,
    };

    #[derive(FromQueryResult)]
    struct UserProfileStatsRow {
        edit_count: i64,
        vote_count: i64,
    }

    let edit_count_query = Query::select()
        .expr(Expr::val(1).count())
        .from(correction_user::Entity)
        .inner_join(
            correction::Entity,
            Expr::col((
                correction_user::Entity,
                correction_user::Column::CorrectionId,
            ))
            .equals((correction::Entity, correction::Column::Id)),
        )
        .and_where(correction_user::Column::UserId.eq(user_id))
        .and_where(
            correction_user::Column::UserType.eq(CorrectionUserType::Author),
        )
        .and_where(correction::Column::Status.eq(CorrectionStatus::Approved))
        .and_where(
            correction::Column::Type
                .is_in([CorrectionType::Create, CorrectionType::Update]),
        )
        .to_owned();

    let vote_count_alias = Alias::new("vote_count");
    let votes_alias = Alias::new("votes");

    let artist_vote_count_query = Query::select()
        .expr_as(Expr::val(1).count(), vote_count_alias.clone())
        .from(artist_tag_vote::Entity)
        .and_where(artist_tag_vote::Column::UserId.eq(user_id))
        .to_owned();

    let release_vote_count_query = Query::select()
        .expr_as(Expr::val(1).count(), vote_count_alias.clone())
        .from(release_tag_vote::Entity)
        .and_where(release_tag_vote::Column::UserId.eq(user_id))
        .to_owned();

    let song_vote_count_query = Query::select()
        .expr_as(Expr::val(1).count(), vote_count_alias.clone())
        .from(song_tag_vote::Entity)
        .and_where(song_tag_vote::Column::UserId.eq(user_id))
        .to_owned();

    let mut vote_union_query = artist_vote_count_query;
    vote_union_query.union(UnionType::All, release_vote_count_query);
    vote_union_query.union(UnionType::All, song_vote_count_query);

    let vote_count_query = Query::select()
        .expr(Func::coalesce([
            Expr::col((votes_alias.clone(), vote_count_alias.clone()))
                .sum()
                .cast_as("bigint"),
            Expr::val(0_i64).into(),
        ]))
        .from_subquery(vote_union_query.take(), votes_alias.clone())
        .to_owned();

    let query = Query::select()
        .expr_as(
            SimpleExpr::SubQuery(
                None,
                Box::new(edit_count_query.into_sub_query_statement()),
            ),
            Alias::new("edit_count"),
        )
        .expr_as(
            SimpleExpr::SubQuery(
                None,
                Box::new(vote_count_query.into_sub_query_statement()),
            ),
            Alias::new("vote_count"),
        )
        .to_owned();

    let stmt = conn.get_database_backend().build(&query);

    let row = UserProfileStatsRow::find_by_statement(stmt)
        .one(conn)
        .await?
        .ok_or_else(|| {
            DbErr::Custom("missing user profile stats row".into())
        })?;

    Ok(UserProfileStats {
        edit_count: row
            .edit_count
            .try_into()
            .map_err(|_| DbErr::Custom("invalid edit_count".into()))?,
        vote_count: row
            .vote_count
            .try_into()
            .map_err(|_| DbErr::Custom("invalid vote_count".into()))?,
    })
}

#[cfg(all(test, feature = "integration-test"))]
mod tests {
    use chrono::Utc;
    use entity::enums::{
        ArtistType, CorrectionStatus, CorrectionType, CorrectionUserType,
        DatePrecision, EntityType, ReleaseType, TagType,
    };
    use entity::{
        artist, artist_tag_vote, correction, correction_user, release,
        release_tag_vote, song, song_tag_vote, tag, user, user_role,
    };
    use sea_orm::ActiveValue::{NotSet, Set};
    use sea_orm::{DatabaseConnection, EntityTrait};

    use super::SeaOrmRepository;
    use crate::domain::model::UserRoleEnum;
    use crate::infra::integration_test::test_connection;

    async fn create_user(
        conn: &DatabaseConnection,
        label: &str,
    ) -> user::Model {
        let suffix = Utc::now().timestamp_nanos_opt().unwrap_or_default();
        let user = user::Entity::insert(user::ActiveModel {
            id: NotSet,
            name: Set(format!("{label}_{suffix}")),
            email: Set(format!("{label}_{suffix}@example.com")),
            email_verified: Set(true),
            password: Set("password_hash".to_string()),
            avatar_id: Set(None),
            last_login: Set(Utc::now().into()),
            created_at: Set(Utc::now().into()),
            profile_banner_id: Set(None),
            bio: Set(None),
            settings: Set(serde_json::json!({})),
        })
        .exec_with_returning(conn)
        .await
        .unwrap();
        user_role::Entity::insert(user_role::ActiveModel {
            user_id: Set(user.id),
            role_id: Set(UserRoleEnum::User.into()),
        })
        .exec(conn)
        .await
        .unwrap();
        user
    }

    async fn create_correction(
        conn: &DatabaseConnection,
        status: CorrectionStatus,
        correction_type: CorrectionType,
        entity_id: i32,
    ) -> correction::Model {
        correction::Entity::insert(correction::ActiveModel {
            id: NotSet,
            status: Set(status),
            r#type: Set(correction_type),
            entity_type: Set(EntityType::Song),
            entity_id: Set(entity_id),
            created_at: Set(Utc::now().into()),
            handled_at: Set(Some(Utc::now().into())),
        })
        .exec_with_returning(conn)
        .await
        .unwrap()
    }

    #[tokio::test]
    async fn find_by_name_includes_profile_stats_from_approved_edits_and_votes()
    {
        let conn = test_connection().await;
        let repo = SeaOrmRepository::new(conn.clone());

        let user = create_user(&conn, "profile_stats_user").await;
        let other_user = create_user(&conn, "profile_stats_other").await;

        let tagged_artist = artist::Entity::insert(artist::ActiveModel {
            id: NotSet,
            name: Set("stats artist".to_string()),
            artist_type: Set(ArtistType::Solo),
            text_alias: Set(None),
            start_date: Set(None),
            start_date_precision: Set(None),
            end_date: Set(None),
            end_date_precision: Set(None),
            current_location_country: Set(None),
            current_location_province: Set(None),
            current_location_city: Set(None),
            start_location_country: Set(None),
            start_location_province: Set(None),
            start_location_city: Set(None),
        })
        .exec_with_returning(&conn)
        .await
        .unwrap();
        let tagged_release = release::Entity::insert(release::ActiveModel {
            id: NotSet,
            title: Set("stats release".to_string()),
            release_type: Set(ReleaseType::Album),
            release_date: Set(None),
            release_date_precision: Set(DatePrecision::Day),
            recording_date_start: Set(None),
            recording_date_start_precision: Set(DatePrecision::Day),
            recording_date_end: Set(None),
            recording_date_end_precision: Set(DatePrecision::Day),
        })
        .exec_with_returning(&conn)
        .await
        .unwrap();
        let tagged_song = song::Entity::insert(song::ActiveModel {
            id: NotSet,
            title: Set("stats song".to_string()),
        })
        .exec_with_returning(&conn)
        .await
        .unwrap();
        let tagged_tag = tag::Entity::insert(tag::ActiveModel {
            id: NotSet,
            name: Set("stats-tag".to_string()),
            r#type: Set(TagType::Genre),
            short_description: Set("stats short".to_string()),
            description: Set("stats description".to_string()),
        })
        .exec_with_returning(&conn)
        .await
        .unwrap();

        let counted_create = create_correction(
            &conn,
            CorrectionStatus::Approved,
            CorrectionType::Create,
            tagged_song.id,
        )
        .await;
        let counted_update = create_correction(
            &conn,
            CorrectionStatus::Approved,
            CorrectionType::Update,
            tagged_song.id,
        )
        .await;
        let ignored_delete = create_correction(
            &conn,
            CorrectionStatus::Approved,
            CorrectionType::Delete,
            tagged_song.id,
        )
        .await;
        let ignored_pending = create_correction(
            &conn,
            CorrectionStatus::Pending,
            CorrectionType::Update,
            tagged_song.id,
        )
        .await;
        let ignored_coauthor = create_correction(
            &conn,
            CorrectionStatus::Approved,
            CorrectionType::Create,
            tagged_song.id,
        )
        .await;
        let ignored_other_author = create_correction(
            &conn,
            CorrectionStatus::Approved,
            CorrectionType::Create,
            tagged_song.id,
        )
        .await;

        correction_user::Entity::insert_many([
            correction_user::ActiveModel {
                correction_id: Set(counted_create.id),
                user_id: Set(user.id),
                user_type: Set(CorrectionUserType::Author),
            },
            correction_user::ActiveModel {
                correction_id: Set(counted_update.id),
                user_id: Set(user.id),
                user_type: Set(CorrectionUserType::Author),
            },
            correction_user::ActiveModel {
                correction_id: Set(ignored_delete.id),
                user_id: Set(user.id),
                user_type: Set(CorrectionUserType::Author),
            },
            correction_user::ActiveModel {
                correction_id: Set(ignored_pending.id),
                user_id: Set(user.id),
                user_type: Set(CorrectionUserType::Author),
            },
            correction_user::ActiveModel {
                correction_id: Set(ignored_coauthor.id),
                user_id: Set(user.id),
                user_type: Set(CorrectionUserType::CoAuthor),
            },
            correction_user::ActiveModel {
                correction_id: Set(ignored_other_author.id),
                user_id: Set(other_user.id),
                user_type: Set(CorrectionUserType::Author),
            },
        ])
        .exec(&conn)
        .await
        .unwrap();

        artist_tag_vote::Entity::insert(artist_tag_vote::ActiveModel {
            artist_id: Set(tagged_artist.id),
            tag_id: Set(tagged_tag.id),
            user_id: Set(user.id),
            score: Set(1),
            voted_at: Set(Utc::now().into()),
        })
        .exec(&conn)
        .await
        .unwrap();
        release_tag_vote::Entity::insert(release_tag_vote::ActiveModel {
            release_id: Set(tagged_release.id),
            tag_id: Set(tagged_tag.id),
            user_id: Set(user.id),
            score: Set(1),
            voted_at: Set(Utc::now().into()),
        })
        .exec(&conn)
        .await
        .unwrap();
        song_tag_vote::Entity::insert(song_tag_vote::ActiveModel {
            song_id: Set(tagged_song.id),
            tag_id: Set(tagged_tag.id),
            user_id: Set(user.id),
            score: Set(1),
            voted_at: Set(Utc::now().into()),
        })
        .exec(&conn)
        .await
        .unwrap();
        song_tag_vote::Entity::insert(song_tag_vote::ActiveModel {
            song_id: Set(tagged_song.id),
            tag_id: Set(tagged_tag.id),
            user_id: Set(other_user.id),
            score: Set(1),
            voted_at: Set(Utc::now().into()),
        })
        .exec(&conn)
        .await
        .unwrap();

        let profile = crate::domain::user::ProfileRepository::find_by_name(
            &repo, &user.name,
        )
        .await
        .unwrap()
        .unwrap();

        assert_eq!(profile.stats.edit_count, 2);
        assert_eq!(profile.stats.vote_count, 3);
    }
}
