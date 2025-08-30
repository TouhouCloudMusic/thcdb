use std::collections::HashMap;

use entity::enums::ReleaseImageType;
use entity::{
    language, release, release_artist, release_artist_history,
    release_catalog_number, release_catalog_number_history, release_credit,
    release_credit_history, release_track_artist,
};
use itertools::Itertools;
use libfp::EmptyExt;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseTransaction, DbErr, EntityTrait,
    LoaderTrait, QueryFilter,
};

use crate::domain;
use crate::domain::release::model::{
    CatalogNumber, Release, ReleaseArtist, ReleaseCredit, ReleaseTrack,
};
use crate::domain::shared::model::NewLocalizedTitle;
use crate::infra::database::sea_orm::cache::{
    LANGUAGE_CACHE, LanguageCache, LanguageCacheMap,
};
use crate::infra::database::sea_orm::ext::maybe_loader::MaybeLoader;

pub(super) struct RelatedEntities {
    pub(super) artists: Vec<Vec<entity::artist::Model>>,
    pub(super) catalog_numbers: Vec<Vec<entity::release_catalog_number::Model>>,
    pub(super) localized_titles:
        Vec<Vec<entity::release_localized_title::Model>>,
    pub(super) languages: &'static LanguageCacheMap,
    pub(super) tracks: Vec<Vec<entity::release_track::Model>>,
    pub(super) track_songs: Vec<entity::song::Model>,
    pub(super) track_artists: Vec<entity::artist::Model>,
    pub(super) track_artist_ids: Vec<Vec<Vec<i32>>>,
    pub(super) credits: Vec<Vec<entity::release_credit::Model>>,
    pub(super) credit_artists: Vec<entity::artist::Model>,
    pub(super) credit_roles: Vec<entity::credit_role::Model>,
    pub(super) cover_arts: Vec<Option<entity::image::Model>>,
}

struct BaseEntities {
    artists: Vec<Vec<entity::artist::Model>>,
    catalog_numbers: Vec<Vec<entity::release_catalog_number::Model>>,
    localized_titles: Vec<Vec<entity::release_localized_title::Model>>,
    tracks: Vec<Vec<entity::release_track::Model>>,
    credits: Vec<Vec<entity::release_credit::Model>>,
}

struct TrackDetails {
    songs: Vec<entity::song::Model>,
    artists: Vec<entity::artist::Model>,
    artist_ids: Vec<Vec<Vec<i32>>>,
}

impl RelatedEntities {
    pub(super) async fn load(
        releases: &[release::Model],
        db: &impl ConnectionTrait,
    ) -> Result<Self, DbErr> {
        let BaseEntities {
            artists,
            catalog_numbers,
            localized_titles,
            tracks,
            credits,
        } = Self::load_base_entities(releases, db).await?;
        let (credit_artists, credit_roles) =
            Self::load_credit_details(&credits, &artists, db).await?;
        let TrackDetails {
            songs: track_songs,
            artists: track_artists,
            artist_ids: track_artist_ids,
        } = Self::load_track_details(&tracks, db).await?;
        let cover_arts = Self::load_cover_arts(releases, db).await?;
        let languages = LANGUAGE_CACHE.get_or_init(db).await?;

        Ok(Self {
            artists,
            catalog_numbers,
            localized_titles,
            languages,
            tracks,
            track_songs,
            track_artists,
            track_artist_ids,
            credits,
            credit_artists,
            credit_roles,
            cover_arts,
        })
    }

    async fn load_base_entities(
        releases: &[release::Model],
        db: &impl ConnectionTrait,
    ) -> Result<BaseEntities, DbErr> {
        let (artists, catalog_numbers, localized_titles, tracks, credits) = tokio::try_join!(
            releases.load_many_to_many(
                entity::artist::Entity,
                entity::release_artist::Entity,
                db
            ),
            releases.load_many(entity::release_catalog_number::Entity, db),
            releases.load_many(entity::release_localized_title::Entity, db),
            releases.load_many(entity::release_track::Entity, db),
            releases.load_many(entity::release_credit::Entity, db),
        )?;

        Ok(BaseEntities {
            artists,
            catalog_numbers,
            localized_titles,
            tracks,
            credits,
        })
    }

    async fn load_credit_details(
        credits: &[Vec<entity::release_credit::Model>],
        artists: &[Vec<entity::artist::Model>],
        db: &impl ConnectionTrait,
    ) -> Result<
        (Vec<entity::artist::Model>, Vec<entity::credit_role::Model>),
        DbErr,
    > {
        let flatten_credits = credits.iter().flatten().cloned().collect_vec();
        let all_artist_ids = artists.iter().flatten().map(|x| x.id).unique();

        let credit_artists = flatten_credits
            .iter()
            .cloned()
            .unique_by(|c| c.artist_id)
            .collect_vec()
            .load_one(
                entity::artist::Entity::find().filter(
                    entity::artist::Column::Id.is_not_in(all_artist_ids),
                ),
                db,
            )
            .await?
            .into_iter()
            .flatten()
            .chain(artists.iter().flatten().cloned())
            .collect_vec();

        let credit_roles = flatten_credits
            .load_one(entity::credit_role::Entity, db)
            .await?
            .into_iter()
            .flatten()
            .collect_vec();

        Ok((credit_artists, credit_roles))
    }

    async fn load_track_details(
        tracks: &[Vec<entity::release_track::Model>],
        db: &impl ConnectionTrait,
    ) -> Result<TrackDetails, DbErr> {
        // TODO: remove clone when loader improvement pr merged
        let flatten_tracks = tracks.iter().flatten().cloned().collect_vec();

        let songs = {
            let song_ids = flatten_tracks.iter().map(|t| t.song_id).unique();
            entity::song::Entity::find()
                .filter(entity::song::Column::Id.is_in(song_ids))
                .all(db)
                .await?
        };

        let artists_per_track = flatten_tracks
            .load_many_to_many(
                entity::artist::Entity,
                entity::release_track_artist::Entity,
                db,
            )
            .await?;

        let artists = artists_per_track
            .iter()
            .flatten()
            .unique_by(|a| a.id)
            .cloned()
            .collect_vec();

        let artist_ids: Vec<Vec<Vec<_>>> = {
            let artist_ids_per_track = artists_per_track
                .into_iter()
                .map(|artists| artists.into_iter().map(|a| a.id).collect_vec())
                .collect_vec();

            let tracks_lens: Vec<usize> = tracks.iter().map(Vec::len).collect();

            let track_count: usize = tracks_lens.iter().sum();

            assert!(
                artist_ids_per_track.len() == track_count,
                "artists_per_track length {} does not match total track slots {track_count}",
                artist_ids_per_track.len()
            );

            tracks_lens
                .into_iter()
                .enumerate()
                .map(|(i, len)| {
                    let slice = &artist_ids_per_track[i..(i + len)];
                    slice.to_vec()
                })
                .collect()
        };

        Ok(TrackDetails {
            songs,
            artists,
            artist_ids,
        })
    }

    async fn load_cover_arts(
        releases: &[release::Model],
        db: &impl ConnectionTrait,
    ) -> Result<Vec<Option<entity::image::Model>>, DbErr> {
        let release_images = releases
            .load_many(
                entity::release_image::Entity::find().filter(
                    entity::release_image::Column::Type
                        .eq(ReleaseImageType::Cover),
                ),
                db,
            )
            .await?
            .into_iter()
            .map(|x| x.into_iter().next())
            .collect_vec();

        release_images
            .maybe_load_one(entity::image::Entity, db)
            .await
    }
}
