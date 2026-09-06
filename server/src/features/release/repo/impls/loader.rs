use std::collections::HashMap;

use entity::enums::ReleaseImageType;
use entity::release;
use itertools::Itertools;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, LoaderTrait, QueryFilter,
    QueryOrder,
};

use crate::features::release::model::ReleaseArtist;
use crate::infra::database::cache::{LANGUAGE_CACHE, LanguageCacheMap};

pub(super) struct RelatedEntities {
    pub(super) artists: Vec<Vec<entity::artist::Model>>,
    pub(super) catalog_numbers: Vec<Vec<entity::release_catalog_number::Model>>,
    pub(super) localized_titles:
        Vec<Vec<entity::release_localized_title::Model>>,
    pub(super) links: Vec<Vec<entity::release_link::Model>>,
    pub(super) languages: &'static LanguageCacheMap,
    pub(super) discs: Vec<Vec<entity::release_disc::Model>>,
    pub(super) tracks: Vec<Vec<entity::release_track::Model>>,
    pub(super) track_songs: Vec<entity::song::Model>,
    pub(super) track_artists: HashMap<i32, Vec<ReleaseArtist>>,
    pub(super) credits: Vec<Vec<entity::release_credit::Model>>,
    pub(super) credit_artists: Vec<entity::artist::Model>,
    pub(super) credit_roles: Vec<entity::credit_role::Model>,
    pub(super) cover_arts: Vec<Option<entity::image::Model>>,
    pub(super) events: Vec<Vec<entity::event::Model>>,
    pub(super) labels: Vec<entity::label::Model>,
}

struct BaseEntities {
    artists: Vec<Vec<entity::artist::Model>>,
    catalog_numbers: Vec<Vec<entity::release_catalog_number::Model>>,
    localized_titles: Vec<Vec<entity::release_localized_title::Model>>,
    links: Vec<Vec<entity::release_link::Model>>,
    discs: Vec<Vec<entity::release_disc::Model>>,
    tracks: Vec<Vec<entity::release_track::Model>>,
    credits: Vec<Vec<entity::release_credit::Model>>,
    events: Vec<Vec<entity::event::Model>>,
}

struct TrackDetails {
    songs: Vec<entity::song::Model>,
    artists: HashMap<i32, Vec<ReleaseArtist>>,
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
            links,
            discs,
            tracks,
            credits,
            events,
        } = Self::load_base_entities(releases, db).await?;
        let (credit_artists, credit_roles) =
            Self::load_credit_details(&credits, &artists, db).await?;
        let TrackDetails {
            songs: track_songs,
            artists: track_artists,
        } = Self::load_track_details(&tracks, db).await?;
        let cover_arts = Self::load_cover_arts(releases, db).await?;
        let languages = LANGUAGE_CACHE.get_or_init(db).await?;

        let labels = {
            let ids = catalog_numbers
                .iter()
                .flatten()
                .filter_map(|cn| cn.label_id)
                .unique();
            entity::label::Entity::find()
                .filter(entity::label::Column::Id.is_in(ids))
                .all(db)
                .await?
        };

        Ok(Self {
            artists,
            catalog_numbers,
            localized_titles,
            links,
            languages,
            discs,
            tracks,
            track_songs,
            track_artists,
            credits,
            credit_artists,
            credit_roles,
            cover_arts,
            events,
            labels,
        })
    }

    async fn load_base_entities(
        releases: &[release::Model],
        db: &impl ConnectionTrait,
    ) -> Result<BaseEntities, DbErr> {
        let (
            artists,
            catalog_numbers,
            localized_titles,
            links,
            discs,
            tracks,
            credits,
            events,
        ) = tokio::try_join!(
            releases.load_many_to_many(
                entity::artist::Entity,
                entity::release_artist::Entity,
                db
            ),
            releases.load_many(entity::release_catalog_number::Entity, db),
            releases.load_many(entity::release_localized_title::Entity, db),
            releases.load_many(entity::release_link::Entity, db),
            releases.load_many(entity::release_disc::Entity, db),
            releases.load_many(entity::release_track::Entity, db),
            releases.load_many(entity::release_credit::Entity, db),
            releases.load_many_to_many(
                entity::event::Entity,
                entity::release_event::Entity,
                db
            ),
        )?;

        Ok(BaseEntities {
            artists,
            catalog_numbers,
            localized_titles,
            links,
            discs,
            tracks,
            credits,
            events,
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

        let unique_artists = flatten_credits
            .iter()
            .unique_by(|c| c.artist_id)
            .cloned()
            .collect_vec();

        let release_artist_ids =
            artists.iter().flatten().map(|x| x.id).unique();

        let credit_artists = unique_artists
            .load_one(
                entity::artist::Entity::find().filter(
                    entity::artist::Column::Id.is_not_in(release_artist_ids),
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

        let artists = flatten_tracks
            .into_iter()
            .zip_eq(artists_per_track)
            .map(|(track, artists)| {
                (
                    track.id,
                    artists
                        .into_iter()
                        .map(|artist| ReleaseArtist {
                            id: artist.id,
                            name: artist.name,
                        })
                        .collect(),
                )
            })
            .collect();

        Ok(TrackDetails { songs, artists })
    }

    async fn load_cover_arts(
        releases: &[release::Model],
        db: &impl ConnectionTrait,
    ) -> Result<Vec<Option<entity::image::Model>>, DbErr> {
        let release_ids =
            releases.iter().map(|release| release.id).collect_vec();

        let mut cover_art_by_release = entity::release_image::Entity::find()
            .filter(
                entity::release_image::Column::ReleaseId
                    .is_in(release_ids.iter().copied()),
            )
            .filter(
                entity::release_image::Column::Type.eq(ReleaseImageType::Cover),
            )
            .find_also_related(entity::image::Entity)
            .order_by_desc(entity::image::Column::UploadedAt)
            .all(db)
            .await?
            .into_iter()
            .fold(HashMap::new(), |mut acc, (release_image, image)| {
                let Some(image) = image else {
                    return acc;
                };

                acc.entry(release_image.release_id).or_insert(image);
                acc
            });

        Ok(releases
            .iter()
            .map(|release| cover_art_by_release.remove(&release.id))
            .collect())
    }
}
