use entity::enums::ReleaseImageType;
use entity::{
    release, release_artist, release_artist_history, release_catalog_number,
    release_catalog_number_history, release_credit, release_credit_history,
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
    CatalogNumber, Release, ReleaseArtist, ReleaseCredit,
};
use crate::domain::shared::model::NewLocalizedTitle;
use crate::infra::database::sea_orm::ext::maybe_loader::MaybeLoader;

mod track;
pub use track::*;

pub async fn find_many_impl(
    select: sea_orm::Select<release::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<Release>, DbErr> {
    let releases = select.all(db).await?;
    let related = RelatedEntities::load(&releases, db).await?;

    let result = releases
        .into_iter()
        .enumerate()
        .map(|(i, release)| conv_to_domain_model(&release, &related, i))
        .collect();

    Ok(result)
}

struct RelatedEntities {
    artists: Vec<Vec<entity::artist::Model>>,
    catalog_numbers: Vec<Vec<entity::release_catalog_number::Model>>,
    localized_titles: Vec<Vec<entity::release_localized_title::Model>>,
    languages: Vec<entity::language::Model>,
    tracks: Vec<Vec<entity::release_track::Model>>,
    credits: Vec<Vec<entity::release_credit::Model>>,
    credit_artists: Vec<entity::artist::Model>,
    credit_roles: Vec<entity::credit_role::Model>,
    cover_arts: Vec<Option<entity::image::Model>>,
}

impl RelatedEntities {
    async fn load(
        releases: &[release::Model],
        db: &impl ConnectionTrait,
    ) -> Result<Self, DbErr> {
        let (artists, catalog_numbers, localized_titles, tracks, credits) = tokio::try_join!(
            releases.load_many_to_many(
                entity::artist::Entity,
                entity::release_artist::Entity,
                db,
            ),
            releases.load_many(entity::release_catalog_number::Entity, db),
            releases.load_many(entity::release_localized_title::Entity, db),
            releases.load_many(entity::release_track::Entity, db),
            releases.load_many(entity::release_credit::Entity, db),
        )?;

        let language_ids = localized_titles
            .iter()
            .flatten()
            .map(|x| x.language_id)
            .unique();
        let languages = entity::language::Entity::find()
            .filter(entity::language::Column::Id.is_in(language_ids))
            .all(db)
            .await?;

        let flatten_credits =
            credits.clone().into_iter().flatten().collect_vec();

        let all_artist_ids = artists.iter().flatten().map(|x| x.id).unique();

        let credit_artists = flatten_credits
            .clone()
            .into_iter()
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
            .chain(artists.clone().into_iter().flatten())
            .collect_vec();

        let credit_roles = flatten_credits
            .load_one(entity::credit_role::Entity, db)
            .await?
            .into_iter()
            .flatten()
            .collect_vec();

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

        let cover_arts = release_images
            .maybe_load_one(entity::image::Entity, db)
            .await?;

        Ok(Self {
            artists,
            catalog_numbers,
            localized_titles,
            languages,
            tracks,
            credits,
            credit_artists,
            credit_roles,
            cover_arts,
        })
    }
}

fn conv_to_domain_model(
    release_model: &release::Model,
    related: &RelatedEntities,
    index: usize,
) -> Release {
    Release {
        id: release_model.id,
        title: release_model.title.clone(),
        release_type: release_model.release_type,
        release_date: release_model.release_date,
        release_date_precision: Some(release_model.release_date_precision),
        recording_date_start: release_model.recording_date_start,
        recording_date_start_precision: Some(
            release_model.recording_date_start_precision,
        ),
        recording_date_end: release_model.recording_date_end,
        recording_date_end_precision: Some(
            release_model.recording_date_end_precision,
        ),
        artists: conv_artists(&related.artists[index]),
        catalog_nums: conv_catalog_numbers(&related.catalog_numbers[index]),
        localized_titles: conv_localized_titles(
            &related.localized_titles[index],
            &related.languages,
        ),
        tracks: related.tracks[index].iter().map(|track| track.id).collect(),
        credits: conv_credits(
            &related.credits[index],
            &related.credit_artists,
            &related.credit_roles,
        ),
        cover_art_url: related.cover_arts[index]
            .clone()
            .map(domain::image::Image::from)
            .map(|image| image.url()),
    }
}

// Map artists to domain model
fn conv_artists(artists: &[entity::artist::Model]) -> Vec<ReleaseArtist> {
    artists
        .iter()
        .map(|artist| ReleaseArtist {
            id: artist.id,
            name: artist.name.clone(),
        })
        .collect()
}

// Map catalog numbers to domain model
fn conv_catalog_numbers(
    catalog_nums: &[entity::release_catalog_number::Model],
) -> Vec<CatalogNumber> {
    catalog_nums
        .iter()
        .map(|cn| CatalogNumber {
            catalog_number: cn.catalog_number.clone(),
            label_id: cn.label_id,
        })
        .collect()
}

// Map localized titles to domain model
fn conv_localized_titles(
    loc_titles: &[entity::release_localized_title::Model],
    languages: &[entity::language::Model],
) -> Vec<crate::domain::shared::model::LocalizedTitle> {
    loc_titles
        .iter()
        .map(|lt| {
            let language = languages
                .iter()
                .find(|l| l.id == lt.language_id)
                .unwrap_or_else(|| {
                    panic!("Language with id {} not found", lt.language_id)
                });

            crate::domain::shared::model::LocalizedTitle {
                language: crate::domain::shared::model::Language {
                    id: language.id,
                    name: language.name.clone(),
                    code: language.code.clone(),
                },
                title: lt.title.clone(),
            }
        })
        .collect()
}

// Map credits to domain model
fn conv_credits(
    credits: &[entity::release_credit::Model],
    credit_artists: &[entity::artist::Model],
    credit_roles: &[entity::credit_role::Model],
) -> Vec<ReleaseCredit> {
    credits
        .iter()
        .map(|credit| {
            let artist = credit_artists
                .iter()
                .find(|a| a.id == credit.artist_id)
                .unwrap_or_else(|| {
                    panic!("Artist with id {} not found", credit.artist_id)
                });

            let role = credit_roles
                .iter()
                .find(|r| r.id == credit.role_id)
                .unwrap_or_else(|| {
                    panic!("Role with id {} not found", credit.role_id)
                });

            ReleaseCredit {
                artist: ReleaseArtist {
                    id: artist.id,
                    name: artist.name.clone(),
                },
                role: crate::domain::shared::model::CreditRole {
                    id: role.id,
                    name: role.name.clone(),
                },
                on: credit.on.clone(),
            }
        })
        .collect()
}

pub(super) async fn create_release_artist(
    release_id: i32,
    artists: &[i32],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if let Some(artists) = artists.into_option() {
        let models = artists
            .iter()
            .copied()
            .map(|artist_id| release_artist::ActiveModel {
                release_id: Set(release_id),
                artist_id: Set(artist_id),
            })
            .collect_vec();

        entity::release_artist::Entity::insert_many(models)
            .exec(db)
            .await?;
    }

    Ok(())
}

pub(super) async fn create_release_artist_history(
    history_id: i32,
    artists: &[i32],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if let Some(artists) = artists.into_option() {
        let models = artists
            .iter()
            .copied()
            .map(|artist_id| release_artist_history::ActiveModel {
                history_id: Set(history_id),
                artist_id: Set(artist_id),
            })
            .collect_vec();

        entity::release_artist_history::Entity::insert_many(models)
            .exec(db)
            .await?;
    }

    Ok(())
}

pub(super) async fn update_release_artist(
    release_id: i32,
    history_id: i32,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    // Delete existing artist relationships
    release_artist::Entity::delete_many()
        .filter(release_artist::Column::ReleaseId.eq(release_id))
        .exec(db)
        .await?;

    // Get artists from history
    if let Some(artists) = release_artist_history::Entity::find()
        .filter(release_artist_history::Column::HistoryId.eq(history_id))
        .all(db)
        .await?
        .into_iter()
        .map(|x| x.artist_id)
        .collect_vec()
        .into_option()
    {
        create_release_artist(release_id, &artists, db).await?;
    }

    Ok(())
}

pub(super) async fn create_release_catalog_number(
    release_id: i32,
    catalog_nums: &[CatalogNumber],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if let Some(catalog_nums) = catalog_nums.into_option() {
        let models = catalog_nums
            .iter()
            .map(|data| release_catalog_number::ActiveModel {
                id: NotSet,
                release_id: Set(release_id),
                label_id: Set(data.label_id),
                catalog_number: Set(data.catalog_number.clone()),
            })
            .collect_vec();

        entity::release_catalog_number::Entity::insert_many(models)
            .exec(db)
            .await?;
    }

    Ok(())
}

pub(super) async fn create_release_catalog_number_history(
    history_id: i32,
    catalog_nums: &[CatalogNumber],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if let Some(catalog_nums) = catalog_nums.into_option() {
        let models = catalog_nums
            .iter()
            .map(|data| release_catalog_number_history::ActiveModel {
                id: NotSet,
                history_id: Set(history_id),
                label_id: Set(data.label_id),
                catalog_number: Set(data.catalog_number.clone()),
            })
            .collect_vec();

        entity::release_catalog_number_history::Entity::insert_many(models)
            .exec(db)
            .await?;
    }

    Ok(())
}

pub(super) async fn update_release_catalog_number(
    release_id: i32,
    history_id: i32,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    // Delete existing catalog numbers
    release_catalog_number::Entity::delete_many()
        .filter(release_catalog_number::Column::ReleaseId.eq(release_id))
        .exec(db)
        .await?;

    // Get catalog numbers from history
    let Some(catalog_nums) = release_catalog_number_history::Entity::find()
        .filter(
            release_catalog_number_history::Column::HistoryId.eq(history_id),
        )
        .all(db)
        .await?
        .into_iter()
        .map(|x| CatalogNumber {
            catalog_number: x.catalog_number,
            label_id: x.label_id,
        })
        .collect_vec()
        .into_option()
    else {
        return Ok(());
    };

    // Create new catalog numbers
    create_release_catalog_number(release_id, &catalog_nums, db).await
}

pub(super) async fn create_release_credit(
    release_id: i32,
    credits: &[crate::domain::release::model::NewCredit],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    use entity::release_credit;

    if credits.is_empty() {
        return Ok(());
    }

    let models = credits
        .iter()
        .map(|credit| release_credit::ActiveModel {
            id: NotSet,
            release_id: Set(release_id),
            artist_id: Set(credit.artist_id),
            role_id: Set(credit.role_id),
            on: Set(credit.on.clone()),
        })
        .collect_vec();

    entity::release_credit::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}

pub(super) async fn create_release_credit_history(
    history_id: i32,
    credits: &[crate::domain::release::model::NewCredit],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if credits.is_empty() {
        return Ok(());
    }

    let models = credits
        .iter()
        .map(|credit| release_credit_history::ActiveModel {
            id: NotSet,
            history_id: Set(history_id),
            artist_id: Set(credit.artist_id),
            role_id: Set(credit.role_id),
            on: Set(credit.on.clone()),
        })
        .collect_vec();

    release_credit_history::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}

pub(super) async fn update_release_credit(
    release_id: i32,
    history_id: i32,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    // Delete existing credits
    release_credit::Entity::delete_many()
        .filter(release_credit::Column::ReleaseId.eq(release_id))
        .exec(db)
        .await?;

    // Get credits from history
    let credits = release_credit_history::Entity::find()
        .filter(release_credit_history::Column::HistoryId.eq(history_id))
        .all(db)
        .await?
        .into_iter()
        .map(|x| crate::domain::release::model::NewCredit {
            artist_id: x.artist_id,
            role_id: x.role_id,
            on: x.on,
        })
        .collect_vec();

    if credits.is_empty() {
        return Ok(());
    }

    // Create new credits
    create_release_credit(release_id, &credits, db).await
}

pub(super) async fn create_release_event(
    release_id: i32,
    events: &[i32],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    use entity::release_event;

    if events.is_empty() {
        return Ok(());
    }

    let models = events
        .iter()
        .map(|event_id| release_event::ActiveModel {
            release_id: Set(release_id),
            event_id: Set(*event_id),
        })
        .collect_vec();

    entity::release_event::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}

pub(super) async fn create_release_event_history(
    history_id: i32,
    events: &[i32],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    use entity::release_event_history;

    if events.is_empty() {
        return Ok(());
    }

    let models = events
        .iter()
        .map(|event_id| release_event_history::ActiveModel {
            history_id: Set(history_id),
            event_id: Set(*event_id),
        })
        .collect_vec();

    entity::release_event_history::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}

pub(super) async fn update_release_event(
    release_id: i32,
    history_id: i32,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    use entity::{release_event, release_event_history};

    // Delete existing events
    release_event::Entity::delete_many()
        .filter(release_event::Column::ReleaseId.eq(release_id))
        .exec(db)
        .await?;

    // Get events from history
    let events = release_event_history::Entity::find()
        .filter(release_event_history::Column::HistoryId.eq(history_id))
        .all(db)
        .await?
        .into_iter()
        .map(|x| x.event_id)
        .collect_vec();

    if events.is_empty() {
        return Ok(());
    }

    // Create new events
    create_release_event(release_id, &events, db).await
}

pub(super) async fn create_release_localized_title(
    release_id: i32,
    localized_titles: &[NewLocalizedTitle],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    use entity::release_localized_title;

    if localized_titles.is_empty() {
        return Ok(());
    }

    let models = localized_titles
        .iter()
        .map(|title| release_localized_title::ActiveModel {
            release_id: Set(release_id),
            language_id: Set(title.language_id),
            title: Set(title.title.clone()),
        })
        .collect_vec();

    entity::release_localized_title::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}

pub(super) async fn create_release_localized_title_history(
    history_id: i32,
    localized_titles: &[NewLocalizedTitle],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    use entity::release_localized_title_history;

    if localized_titles.is_empty() {
        return Ok(());
    }

    let models = localized_titles
        .iter()
        .map(|title| release_localized_title_history::ActiveModel {
            history_id: Set(history_id),
            language_id: Set(title.language_id),
            title: Set(title.title.clone()),
        })
        .collect_vec();

    entity::release_localized_title_history::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}

pub(super) async fn update_release_localized_title(
    release_id: i32,
    history_id: i32,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    use entity::{release_localized_title, release_localized_title_history};

    // Delete existing localized titles
    release_localized_title::Entity::delete_many()
        .filter(release_localized_title::Column::ReleaseId.eq(release_id))
        .exec(db)
        .await?;

    // Get localized titles from history
    let localized_titles = release_localized_title_history::Entity::find()
        .filter(
            release_localized_title_history::Column::HistoryId.eq(history_id),
        )
        .all(db)
        .await?
        .into_iter()
        .map(|x| NewLocalizedTitle {
            language_id: x.language_id,
            title: x.title,
        })
        .collect_vec();

    if localized_titles.is_empty() {
        return Ok(());
    }

    // Create new localized titles
    create_release_localized_title(release_id, &localized_titles, db).await
}
