use entity::{release, release_rating, song, song_rating};
use infra_testing::MockUser;
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, TransactionTrait,
};

use super::{Rating, RatingTarget, RatingTargetKind, get, set};

async fn create_target(
    conn: &impl ConnectionTrait,
    kind: RatingTargetKind,
) -> anyhow::Result<RatingTarget> {
    let id = match kind {
        RatingTargetKind::Release => {
            release::Entity::insert(release::ActiveModel {
                title: Set("rating release".to_string()),
                release_type: Set(entity::enums::ReleaseType::Album),
                ..Default::default()
            })
            .exec_with_returning(conn)
            .await?
            .id
        }
        RatingTargetKind::Song => {
            song::Entity::insert(song::ActiveModel {
                title: Set("rating song".to_string()),
                ..Default::default()
            })
            .exec_with_returning(conn)
            .await?
            .id
        }
    };
    Ok(RatingTarget { kind, id })
}

async fn insert_rating(
    conn: &impl ConnectionTrait,
    target: RatingTarget,
    user_id: i32,
    rating: i16,
) -> anyhow::Result<()> {
    match target.kind {
        RatingTargetKind::Release => {
            release_rating::Entity::insert(release_rating::ActiveModel {
                release_id: Set(target.id),
                user_id: Set(user_id),
                rating: Set(rating),
            })
            .exec(conn)
            .await?;
        }
        RatingTargetKind::Song => {
            song_rating::Entity::insert(song_rating::ActiveModel {
                song_id: Set(target.id),
                user_id: Set(user_id),
                rating: Set(rating),
            })
            .exec(conn)
            .await?;
        }
    }
    Ok(())
}

async fn stored_ratings(
    conn: &impl ConnectionTrait,
    target: RatingTarget,
) -> anyhow::Result<Vec<i16>> {
    let ratings = match target.kind {
        RatingTargetKind::Release => release_rating::Entity::find()
            .filter(release_rating::Column::ReleaseId.eq(target.id))
            .all(conn)
            .await?
            .into_iter()
            .map(|row| row.rating)
            .collect(),
        RatingTargetKind::Song => song_rating::Entity::find()
            .filter(song_rating::Column::SongId.eq(target.id))
            .all(conn)
            .await?
            .into_iter()
            .map(|row| row.rating)
            .collect(),
    };
    Ok(ratings)
}

#[tokio::test]
async fn reading_ratings_returns_the_target_average_and_count()
-> anyhow::Result<()> {
    let conn = infra_testing::test_connection().await;
    let tx = conn.begin().await?;
    let user = MockUser::with_label("rating-user").insert(&tx).await?;
    let other_user = MockUser::with_label("rating-other").insert(&tx).await?;

    for kind in [RatingTargetKind::Release, RatingTargetKind::Song] {
        let target = create_target(&tx, kind).await?;
        let empty_target = create_target(&tx, kind).await?;
        insert_rating(&tx, target, user.id, 7).await?;
        insert_rating(&tx, target, other_user.id, 2).await?;

        let summary = get(&tx, empty_target, None).await?;
        assert_eq!(summary.count, 0);
        assert_eq!(summary.average, None);

        let summary = get(&tx, target, None).await?;
        assert_eq!(summary.count, 2);
        assert_eq!(summary.average, Some(2.25));
    }

    tx.rollback().await?;
    Ok(())
}

#[tokio::test]
async fn changing_a_rating_replaces_the_users_vote() -> anyhow::Result<()> {
    let conn = infra_testing::test_connection().await;
    let tx = conn.begin().await?;
    let user = MockUser::with_label("rating-user").insert(&tx).await?;

    for kind in [RatingTargetKind::Release, RatingTargetKind::Song] {
        let target = create_target(&tx, kind).await?;
        set(&tx, target, user.id, Rating::Half).await?;
        assert_eq!(stored_ratings(&tx, target).await?, [1]);
        set(&tx, target, user.id, Rating::FourAndHalf).await?;
        assert_eq!(stored_ratings(&tx, target).await?, [9]);
    }

    tx.rollback().await?;
    Ok(())
}
