use std::path::PathBuf;

use auth_core::permission::Permission;
use entity::enums::{CorrectionStatus, CorrectionType, CorrectionUserType};
use entity::relation::UserRelationExt;
use entity::user_following;
use infra_db::SeaOrmRepository;
use macros::FieldEnum;
use sea_orm::prelude::Expr;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, FromQueryResult,
    JoinType, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, QueryTrait,
    RelationTrait,
};
use sea_orm_migration::prelude::Alias;
use sea_query::{Func, Query, SimpleExpr, UnionType};

use crate::features::auth::UserRole;
use crate::features::user::User;
use crate::features::user_profile::{UserProfile, UserProfileStats};
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

#[expect(clippy::too_many_lines)]
pub(crate) async fn find_by_name(
    repo: &SeaOrmRepository,
    name: &str,
) -> Result<Option<UserProfile>, DatabaseError> {
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
        .one(&repo.conn)
        .await
        .db_operation("find user profile")?
    else {
        return Ok(None);
    };

    let user_roles = user_role::Entity::find()
        .column(user_role::Column::RoleId)
        .filter(user_role::Column::UserId.eq(profile.id))
        .all(&repo.conn)
        .await
        .db_operation("find user profile roles")?;
    let permissions = find_user_permission_names(profile.id, &repo.conn)
        .await
        .db_operation("find user profile permissions")?;
    let stats = find_profile_stats(profile.id, &repo.conn)
        .await
        .db_operation("find user profile stats")?;

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
        id: profile.id,
        name: profile.name,
        last_login: profile.last_login,
        avatar_url,
        banner_url,
        roles: user_roles
            .into_iter()
            .map(UserRole::try_from)
            .collect::<Result<_, _>>()?,
        permissions,
        is_following: None,
        bio: profile.bio,
        stats,
        settings: None,
    }))
}

pub(crate) async fn with_following(
    repo: &SeaOrmRepository,
    profile: &mut UserProfile,
    current_user: &User,
) -> Result<(), DatabaseError> {
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
        .count(&repo.conn)
        .await
        .db_operation("check user profile follow relationship")?;

    profile.is_following = Some(res > 0);

    Ok(())
}

async fn find_user_permission_names(
    user_id: i32,
    conn: &impl ConnectionTrait,
) -> Result<Vec<Permission>, DbErr> {
    use entity::{permission, role_permission, user_role};

    let names = user_role::Entity::find()
        .select_only()
        .column(permission::Column::Name)
        .filter(user_role::Column::UserId.eq(user_id))
        .join(JoinType::InnerJoin, user_role::Relation::Role.def())
        .join(
            JoinType::InnerJoin,
            role_permission::Relation::Role.def().rev(),
        )
        .join(
            JoinType::InnerJoin,
            role_permission::Relation::Permission.def(),
        )
        .order_by_asc(permission::Column::Name)
        .distinct()
        .into_tuple::<String>()
        .all(conn)
        .await?;

    names
        .into_iter()
        .map(|name| Permission::try_from(name).map_err(DbErr::Custom))
        .collect()
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
        .expect("profile stats aggregate query returns exactly one row");

    Ok(UserProfileStats {
        edit_count: row
            .edit_count
            .try_into()
            .expect("COUNT result is non-negative"),
        vote_count: row
            .vote_count
            .try_into()
            .expect("COUNT result is non-negative"),
    })
}

#[cfg(all(test, feature = "integration-test"))]
mod tests {
    use chrono::Utc;
    use entity::enums::{
        CorrectionStatus, CorrectionType, CorrectionUserType, EntityType,
    };
    use entity::{
        artist_tag_vote, correction, correction_user, release_tag_vote,
        song_tag_vote,
    };
    use infra_db::SeaOrmRepository;
    use sea_orm::ActiveValue::{NotSet, Set};
    use sea_orm::{DatabaseConnection, EntityTrait};

    use crate::infra::integration_test::fixture::{
        MockArtist, MockRelease, MockSong, MockTag, MockUser,
    };
    use crate::infra::integration_test::test_connection;

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

    #[expect(
        clippy::too_many_lines,
        reason = "integration scenario keeps profile stats setup serial"
    )]
    #[tokio::test]
    async fn find_by_name_includes_profile_stats_from_approved_edits_and_votes()
    -> anyhow::Result<()> {
        let conn = test_connection().await?;
        let repo = SeaOrmRepository::new(conn.clone());

        let user = MockUser::with_label("profile_stats_user")
            .insert(&conn)
            .await
            .unwrap();
        let other_user = MockUser::with_label("profile_stats_other")
            .insert(&conn)
            .await
            .unwrap();

        let tagged_artist = MockArtist::named("stats artist")
            .insert(&conn)
            .await
            .unwrap();
        let tagged_release = MockRelease::titled("stats release")
            .insert(&conn)
            .await
            .unwrap();
        let tagged_song =
            MockSong::titled("stats song").insert(&conn).await.unwrap();
        let tagged_tag =
            MockTag::named("stats-tag").insert(&conn).await.unwrap();

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

        let profile = super::find_by_name(&repo, &user.name)
            .await
            .unwrap()
            .unwrap();

        assert_eq!(profile.stats.edit_count, 2);
        assert_eq!(profile.stats.vote_count, 3);

        Ok(())
    }
}
