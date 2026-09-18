use sea_orm::{ColumnTrait, QueryFilter};

use super::*;

#[tokio::test]
async fn release_pagination_keeps_its_boundary_after_the_anchor_is_edited()
-> anyhow::Result<()> {
    let conn = infra_testing::test_connection().await;
    let repo = SeaOrmRepository::new(conn.clone());
    let early: NaiveDate = "2023-01-01".parse()?;
    let middle: NaiveDate = "2024-01-01".parse()?;
    let late: NaiveDate = "2025-01-01".parse()?;

    let artist = MockArtist::named("stable release boundary")
        .insert(&conn)
        .await?;
    let releases = insert_releases(
        &conn,
        &[
            ("A", Some(late), Vec::new()),
            ("B", Some(middle), Vec::new()),
        ],
    )
    .await?;
    let roles = insert_credit_roles(&conn, artist.id, 1).await?;
    insert_release_credits_for_roles(&conn, artist.id, &releases, &roles, None)
        .await?;
    let query = |cursor| CreditQuery {
        artist_id: artist.id,
        cursor,
        limit: 1,
        scope: ArtistCreditScope::Release,
        sort: ArtistCreditSort::Newest,
        role_id: None,
    };
    let first = credits(&repo, query(None)).await?;
    assert_eq!(release_ids(&first), vec![releases[0].id]);
    let cursor = first.next_cursor.context("second release page")?;

    let mut anchor = releases[0].clone().into_active_model();
    anchor.title = Set("Z".to_owned());
    anchor.release_date = Set(Some(early));
    anchor.update(&conn).await?;

    let next = credits(&repo, query(Some(cursor))).await?;
    assert_eq!(release_ids(&next), vec![releases[1].id]);
    Ok(())
}

#[tokio::test]
async fn song_pagination_keeps_its_boundary_after_the_anchor_is_deleted()
-> anyhow::Result<()> {
    let conn = infra_testing::test_connection().await;
    let repo = SeaOrmRepository::new(conn.clone());

    let artist = MockArtist::named("stable song boundary")
        .insert(&conn)
        .await?;
    let songs = insert_songs(&conn, &["A", "B"]).await?;
    insert_song_credits(
        &conn,
        artist.id,
        &[(songs[0].id, None), (songs[1].id, None)],
    )
    .await?;
    let query = |cursor| CreditQuery {
        artist_id: artist.id,
        cursor,
        limit: 1,
        scope: ArtistCreditScope::Song,
        sort: ArtistCreditSort::Newest,
        role_id: None,
    };
    let first = credits(&repo, query(None)).await?;
    assert_eq!(song_ids(&first), vec![songs[0].id]);
    let cursor = first.next_cursor.context("second song page")?;

    song_credit::Entity::delete_many()
        .filter(song_credit::Column::SongId.eq(songs[0].id))
        .exec(&conn)
        .await?;
    song::Entity::delete_by_id(songs[0].id).exec(&conn).await?;

    let next = credits(&repo, query(Some(cursor))).await?;
    assert_eq!(song_ids(&next), vec![songs[1].id]);
    Ok(())
}

#[tokio::test]
async fn song_pagination_does_not_reopen_completed_release_groups()
-> anyhow::Result<()> {
    let conn = infra_testing::test_connection().await;
    let repo = SeaOrmRepository::new(conn.clone());
    let artist = MockArtist::named("completed release groups")
        .insert(&conn)
        .await?;
    let roles = insert_credit_roles(&conn, artist.id, 1).await?;
    let release = MockRelease::titled("A").insert(&conn).await?;
    insert_release_credits(&conn, artist.id, &[(release.id, roles[0].id)])
        .await?;
    let orphan = MockSong::titled("Orphan").insert(&conn).await?;
    insert_song_credits(&conn, artist.id, &[(orphan.id, None)]).await?;
    let query = |cursor| CreditQuery {
        artist_id: artist.id,
        cursor,
        limit: 1,
        scope: ArtistCreditScope::All,
        sort: ArtistCreditSort::Newest,
        role_id: None,
    };

    let first = credits(&repo, query(None)).await?;
    assert_eq!(release_ids(&first), vec![release.id]);
    let cursor = first.next_cursor.context("orphan song page")?;
    assert_eq!(cursor, CreditsCursor::Song { after: None });
    let later_release = MockRelease::titled("B").insert(&conn).await?;
    insert_release_credits(
        &conn,
        artist.id,
        &[(later_release.id, roles[0].id)],
    )
    .await?;

    let next = credits(&repo, query(Some(cursor))).await?;
    assert!(next.release.is_empty());
    assert_eq!(song_ids(&next), vec![orphan.id]);
    assert!(next.next_cursor.is_none());
    Ok(())
}
