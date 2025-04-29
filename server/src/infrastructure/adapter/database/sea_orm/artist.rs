use std::collections::HashMap;
use std::path::PathBuf;

use entity::sea_orm_active_enums::ArtistImageType;
use entity::{
    artist_alias, artist_image, artist_link, artist_localized_name,
    credit_role, group_member, group_member_join_leave, group_member_role,
    image, language,
};
use itertools::{Itertools, izip};
use sea_orm::{
    ColumnTrait, Condition, DatabaseConnection, DbErr, EntityTrait,
    FromQueryResult, LoaderTrait, QueryFilter,
};
use sea_orm_migration::prelude::IntoCondition;

use super::SeaOrmRepository;
use crate::domain::artist::model::{Artist, GroupAssociation, Tenure};
use crate::domain::artist::repository::Repository;
use crate::domain::share::model::{CreditRole, LocalizedName};

impl Repository for SeaOrmRepository {
    async fn find_by_id(&self, id: i32) -> Result<Option<Artist>, Self::Error> {
        find_many_impl(entity::artist::Column::Id.eq(id), &self.conn)
            .await
            .map(|x| x.into_iter().next())
    }

    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Vec<Artist>, Self::Error> {
        find_many_impl(entity::artist::Column::Name.eq(name), &self.conn).await
    }
}

#[derive(FromQueryResult)]
struct ArtistImage {
    artist_id: i32,
    #[sea_orm(nested)]
    image: image::Model,
    r#type: ArtistImageType,
}

#[expect(clippy::too_many_lines, reason = "TODO")]
async fn find_many_impl(
    cond: impl IntoCondition,
    db: &DatabaseConnection,
) -> Result<Vec<Artist>, DbErr> {
    let artists = entity::artist::Entity::find().filter(cond).all(db).await?;

    let ids = artists.iter().map(|x| x.id).unique().collect_vec();
    let aliases = artist_alias::Entity::find()
        .filter(
            Condition::any()
                .add(artist_alias::Column::FirstId.is_in(ids.iter().copied()))
                .add(artist_alias::Column::SecondId.is_in(ids.iter().copied())),
        )
        .all(db)
        .await?;

    let artist_images = artist_image::Entity::find()
        .filter(artist_image::Column::ArtistId.is_in(ids.clone()))
        .left_join(image::Entity)
        .into_model::<ArtistImage>()
        .all(db)
        .await?;

    let mut images_map: HashMap<i32, Vec<_>> = artist_images.into_iter().fold(
        HashMap::new(),
        |mut acc, artist_image| {
            acc.entry(artist_image.artist_id)
                .or_default()
                .push(artist_image);
            acc
        },
    );

    let (artists, images): (Vec<_>, Vec<_>) = artists
        .into_iter()
        .map(|artist| {
            let artist_images =
                images_map.remove(&artist.id).unwrap_or_default();
            (artist, artist_images)
        })
        .unzip();

    let links = artists.load_many(artist_link::Entity, db).await?;

    let localized_names =
        artists.load_many(artist_localized_name::Entity, db).await?;

    let group_members = group_member::Entity::find()
        .filter(
            Condition::any()
                .add(group_member::Column::MemberId.is_in(ids.iter().copied()))
                .add(group_member::Column::GroupId.is_in(ids)),
        )
        .all(db)
        .await?;

    let roles = group_members
        .load_many_to_many(credit_role::Entity, group_member_role::Entity, db)
        .await?;

    let join_leaves = group_members
        .load_many(group_member_join_leave::Entity, db)
        .await?;

    let group_association =
        izip!(group_members, roles, join_leaves).collect_vec();

    let langs = language::Entity::find()
        .filter(
            language::Column::Id.is_in(
                localized_names
                    .iter()
                    .flat_map(|x| x.iter().map(|x| x.language_id)),
            ),
        )
        .all(db)
        .await?;

    let ret = izip!(artists, links, localized_names, images)
        .map(|(artist, links, localized_names, image)| {
            let start_date =
                match (artist.start_date, artist.start_date_precision) {
                    (Some(date), Some(precision)) => {
                        Some((date, precision).into())
                    }
                    _ => None,
                };

            let end_date = match (artist.end_date, artist.end_date_precision) {
                (Some(date), Some(precision)) => Some((date, precision).into()),
                _ => None,
            };

            let aliases = aliases
                .iter()
                .filter(|x| x.first_id == artist.id || x.second_id == artist.id)
                .map(|x| {
                    if x.first_id == artist.id {
                        x.second_id
                    } else {
                        x.first_id
                    }
                })
                .collect();

            let localized_names = localized_names
                .into_iter()
                .map(|model| LocalizedName {
                    name: model.name,
                    language: langs
                        .iter()
                        .find(|y| y.id == model.language_id)
                        .unwrap()
                        .clone()
                        .into(),
                })
                .collect();

            let group_association = group_association
                .iter()
                .filter(|(model, _, _)| {
                    if artist.artist_type.is_solo() {
                        model.member_id == artist.id
                    } else {
                        model.group_id == artist.id
                    }
                })
                .map(|(model, role, tenure)| {
                    let artist_id = if artist.artist_type.is_solo() {
                        model.group_id
                    } else {
                        model.member_id
                    };

                    let tenure = tenure
                        .iter()
                        .sorted_by_key(|x| x.id)
                        .map_into::<Tenure>()
                        .collect_vec();

                    GroupAssociation {
                        artist_id,
                        roles: role
                            .iter()
                            .map(|x| CreditRole {
                                id: x.id,
                                name: x.name.clone(),
                            })
                            .collect_vec(),
                        tenure,
                    }
                })
                .collect();

            let profile_image_url = image
                .iter()
                .find(|x| x.r#type == ArtistImageType::Profile)
                .map(|x| {
                    let image = &x.image;
                    // url
                    PathBuf::from_iter([&image.directory, &image.filename])
                        .to_string_lossy()
                        .to_string()
                });

            Artist {
                id: artist.id,
                name: artist.name,
                artist_type: artist.artist_type,
                text_alias: artist.text_alias,
                start_date,
                end_date,

                aliases,
                links: links.into_iter().map(|x| x.url).collect_vec(),
                localized_names,
                group_association,
                profile_image_url,
            }
        })
        .collect_vec();

    Ok(ret)
}
