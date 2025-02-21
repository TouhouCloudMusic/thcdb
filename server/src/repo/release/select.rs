use entity::prelude::{
    Artist, CreditRole, ReleaseArtist, ReleaseCredit, ReleaseLocalizedTitle,
    ReleaseTrack,
};
use entity::{artist, language, release, release_catalog_number};
use itertools::{Itertools, izip};
use sea_orm::sea_query::IntoCondition;
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityName, EntityTrait, LoaderTrait,
    QueryFilter,
};

use crate::dto;
use crate::dto::release::ReleaseResponse;
use crate::dto::share::LocalizedTitle;
use crate::error::RepositoryError;
use crate::utils::MapInto;

pub async fn find_by_id(
    id: i32,
    db: &impl ConnectionTrait,
) -> Result<ReleaseResponse, RepositoryError> {
    find_many(release::Column::Id.eq(id), db)
        .await?
        .into_iter()
        .next()
        .ok_or_else(|| RepositoryError::EntityNotFound {
            entity_name: release::Entity.table_name(),
        })
}

pub async fn find_by_keyword(
    kw: String,
    db: &impl ConnectionTrait,
) -> Result<Vec<ReleaseResponse>, RepositoryError> {
    find_many(release::Column::Title.like(kw), db).await
}

#[allow(clippy::too_many_lines)]
async fn find_many(
    cond: impl IntoCondition,
    db: &impl ConnectionTrait,
) -> Result<Vec<ReleaseResponse>, RepositoryError> {
    let releases = release::Entity::find().filter(cond).all(db).await?;

    let artists = releases
        .load_many_to_many(Artist, ReleaseArtist, db)
        .await?;

    let catalog_nums = releases
        .load_many(release_catalog_number::Entity, db)
        .await?;

    let llts = releases.load_many(ReleaseLocalizedTitle, db).await?;

    let langs = language::Entity::find()
        .filter(
            language::Column::Id.is_in(
                llts.iter()
                    .flatten()
                    .map(|x| x.language_id)
                    .unique()
                    .collect_vec(),
            ),
        )
        .all(db)
        .await?;

    let tracks = releases.load_many(ReleaseTrack, db).await?;

    let release_artist_ids =
        artists.iter().flatten().unique_by(|a| a.id).map(|x| x.id);

    let credits = releases.load_many(ReleaseCredit, db).await?;

    let flatten_credits = credits.clone().into_iter().flatten().collect_vec();

    let all_artists = flatten_credits
        .clone()
        .into_iter()
        .unique_by(|c| c.artist_id)
        .collect_vec()
        .load_one(
            artist::Entity::find()
                .filter(artist::Column::Id.is_not_in(release_artist_ids)),
            db,
        )
        .await?
        .into_iter()
        .flatten()
        .chain(artists.clone().into_iter().flatten())
        .collect_vec();

    let all_roles = flatten_credits
        .load_one(CreditRole, db)
        .await?
        .into_iter()
        .flatten()
        .collect_vec();

    let res = izip!(releases, artists, credits, catalog_nums, llts, tracks)
        .map(
            |(
                model,
                artists,
                credits,
                catalog_nums,
                localized_titles,
                tracks,
            )| {
                ReleaseResponse {
                    id: model.id,
                    release_type: model.release_type,
                    release_date: model.release_date,
                    release_date_precision: Some(model.release_date_precision),
                    recording_date_start: model.recording_date_start,
                    recording_date_start_precision: Some(
                        model.recording_date_start_precision,
                    ),
                    recording_date_end: model.recording_date_end,
                    recording_date_end_precision: Some(
                        model.recording_date_end_precision,
                    ),
                    artists: artists.into_iter().map_into().collect(),
                    credits: credits
                        .into_iter()
                        .map(|c| dto::release::ReleaseCredit {
                            artist: all_artists
                                .iter()
                                .find(|a| a.id == c.artist_id)
                                .unwrap()
                                .into(),
                            role: all_roles
                                .iter()
                                .find(|r| r.id == c.role_id)
                                .unwrap()
                                .into(),
                            on: c.on,
                        })
                        .collect(),
                    catalog_nums: catalog_nums.map_into(),
                    localized_titles: localized_titles
                        .into_iter()
                        .map(|x| LocalizedTitle {
                            language: langs
                                .iter()
                                .find(|l| l.id == x.language_id)
                                .unwrap()
                                .into(),
                            title: x.title,
                        })
                        .collect(),
                    tracks: tracks.into_iter().map(|x| x.id).collect(),
                }
            },
        )
        .collect();

    Ok(res)
}
