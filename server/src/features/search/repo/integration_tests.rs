use anyhow::{Context, Result};
use domain::shared::SimpleArtist;
use entity::{language, release_artist, release_localized_title};
use infra_db::SeaOrmRepository;
use sea_orm::ActiveValue::Set;
use sea_orm::{EntityTrait, QueryOrder};

use super::search_releases;
use crate::infra::integration_test::fixture::{MockArtist, MockRelease};
use crate::infra::integration_test::test_connection;

#[tokio::test]
async fn release_search_paginates_ranked_matches_with_their_listings()
-> Result<()> {
    let repo = SeaOrmRepository::new(test_connection().await?);
    let conn = &repo.conn;
    let language = language::Entity::find()
        .order_by_asc(language::Column::Id)
        .one(conn)
        .await?
        .context("startup language exists")?;

    // The production entry point reads from the pool. Use a fresh term to
    // isolate committed fixtures from other tests and previous runs.
    let keyword = format!("{:032x}", rand::random::<u128>());
    let translated = MockRelease::titled(format!("{keyword} Archive Edition"))
        .insert(conn)
        .await?;
    let weaker =
        MockRelease::titled(format!("{keyword} Remastered Live Bonus Tracks"))
            .insert(conn)
            .await?;
    let primary = MockRelease::titled(keyword.clone()).insert(conn).await?;

    // The translation beats the longer primary title on the first release.
    // On the exact match, the primary title wins the case-insensitive tie.
    let translation = format!("{keyword} EP");
    release_localized_title::Entity::insert_many([
        release_localized_title::ActiveModel {
            release_id: Set(translated.id),
            language_id: Set(language.id),
            title: Set(translation.clone()),
        },
        release_localized_title::ActiveModel {
            release_id: Set(primary.id),
            language_id: Set(language.id),
            title: Set(keyword.to_ascii_uppercase()),
        },
    ])
    .exec(conn)
    .await?;
    let artist = MockArtist::named("Release search listing artist")
        .insert(conn)
        .await?;
    release_artist::Entity::insert(release_artist::ActiveModel {
        release_id: Set(translated.id),
        artist_id: Set(artist.id),
    })
    .exec(conn)
    .await?;

    let first_page = search_releases(&repo, &keyword, 2, 0).await?;
    let first_matches = first_page
        .items
        .iter()
        .map(|hit| {
            (
                hit.item.id,
                hit.item.title.as_str(),
                hit.matched_name.as_deref(),
            )
        })
        .collect::<Vec<_>>();
    assert_eq!(
        first_matches,
        [
            (primary.id, keyword.as_str(), None),
            (
                translated.id,
                translated.title.as_str(),
                Some(translation.as_str())
            ),
        ],
    );
    assert!(first_page.items[0].item.artists.is_empty());
    assert!(first_page.items[0].item.cover_art_url.is_none());
    assert!(first_page.items[0].item.catalog_numbers.is_empty());
    assert_eq!(
        first_page.items[1].item.artists,
        [SimpleArtist {
            id: artist.id,
            name: artist.name,
        }],
    );
    let next_cursor = first_page.next_cursor.context("second page exists")?;
    assert_eq!(next_cursor, 2);

    let last_page = search_releases(&repo, &keyword, 2, next_cursor).await?;
    let last_matches = last_page
        .items
        .iter()
        .map(|hit| (hit.item.id, hit.matched_name.as_deref()))
        .collect::<Vec<_>>();
    assert_eq!(last_matches, [(weaker.id, None)]);
    assert_eq!(last_page.next_cursor, None);

    let empty_page = search_releases(&repo, &keyword, 2, i32::MAX).await?;
    assert!(empty_page.items.is_empty());
    assert_eq!(empty_page.next_cursor, None);

    Ok(())
}
