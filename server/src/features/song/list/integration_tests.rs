use anyhow::{Context, Result};
use domain::shared::SimpleArtist;
use entity::{
    release, release_artist, release_disc, release_track, song, song_artist,
};
use sea_orm::ActiveValue::Set;
use sea_orm::{ColumnTrait, EntityTrait, IntoActiveModel, QueryFilter};
use song_repo::list::load;

use crate::infra::integration_test::fixture::{
    MockArtist, MockRelease, MockSong,
};

#[tokio::test]
async fn song_artists_take_precedence_over_the_first_release_artists()
-> Result<()> {
    let conn = infra_testing::test_connection().await;
    let tx = conn.begin().await?;
    let own_artist = MockArtist::named("Song artist").insert(&tx).await?;
    let release_artist =
        MockArtist::named("Release artist").insert(&tx).await?;
    let own = MockSong::titled("Song with its own artist")
        .insert(&tx)
        .await?;
    let fallback = MockSong::titled("Song using release artists")
        .insert(&tx)
        .await?;
    let standalone = MockSong::titled("Song without a release")
        .insert(&tx)
        .await?;
    song_artist::Entity::insert(song_artist::ActiveModel {
        song_id: Set(own.id),
        artist_id: Set(own_artist.id),
    })
    .exec(&tx)
    .await?;

    let mut release_ids = Vec::new();
    for (title, date, artist_id) in [
        ("Undated release", None, own_artist.id),
        ("First dated release", Some("2020-01-01"), release_artist.id),
        ("Same date later ID", Some("2020-01-01"), own_artist.id),
    ] {
        let release_id = release::Entity::insert(release::ActiveModel {
            release_date: Set(date.map(str::parse).transpose()?),
            ..MockRelease::titled(title).into_active_model()
        })
        .exec(&tx)
        .await?
        .last_insert_id;
        release_ids.push(release_id);
        release_artist::Entity::insert(release_artist::ActiveModel {
            release_id: Set(release_id),
            artist_id: Set(artist_id),
        })
        .exec(&tx)
        .await?;
        let disc_id = release_disc::Entity::insert(release_disc::ActiveModel {
            release_id: Set(release_id),
            ..Default::default()
        })
        .exec(&tx)
        .await?
        .last_insert_id;
        for song_id in [own.id, fallback.id, fallback.id] {
            release_track::Entity::insert(release_track::ActiveModel {
                release_id: Set(release_id),
                song_id: Set(song_id),
                disc_id: Set(disc_id),
                ..Default::default()
            })
            .exec(&tx)
            .await?;
        }
    }

    let loaded = load(
        song::Entity::find().filter(song::Column::Id.is_in([
            own.id,
            fallback.id,
            standalone.id,
        ])),
        &tx,
    )
    .await?;
    let standalone_listing = loaded
        .iter()
        .find(|song| song.id == standalone.id)
        .context("standalone song is listed")?;
    let fallback_listing = loaded
        .iter()
        .find(|song| song.id == fallback.id)
        .context("song using release artists is listed")?;
    let own_listing = loaded
        .iter()
        .find(|song| song.id == own.id)
        .context("song with its own artist is listed")?;
    assert!(standalone_listing.artists.is_empty());
    assert!(standalone_listing.releases.is_empty());
    assert_eq!(
        fallback_listing.artists,
        [SimpleArtist {
            id: release_artist.id,
            name: release_artist.name
        }]
    );
    assert_eq!(
        own_listing.artists,
        [SimpleArtist {
            id: own_artist.id,
            name: own_artist.name
        }]
    );
    assert_eq!(
        fallback_listing
            .releases
            .iter()
            .map(|release| release.id)
            .collect::<Vec<_>>(),
        [release_ids[1], release_ids[2], release_ids[0]]
    );
    assert_eq!(own_listing.releases.len(), release_ids.len());
    tx.rollback().await?;
    Ok(())
}
