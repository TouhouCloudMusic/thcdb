use std::collections::HashMap;

use domain::credit_role::CreditRoleRef;
use domain::shared::{LocalizedName, Location, SimpleArtist};
use entity::sea_orm_active_enums::{ArtistImageType, ArtistType};
use entity::{
    artist, artist_alias, artist_image, artist_link, artist_localized_name,
    artist_membership, artist_membership_role, artist_membership_tenure,
    credit_role, image, language,
};
use enumset::EnumSet;
use infra_db::error::{DatabaseError, DatabaseResultExt};
use itertools::{Itertools, izip};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, LoaderTrait, QueryFilter,
    QueryOrder, Select,
};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{Cond, ExprTrait, Func, SimpleExpr, any};

use crate::ArtistReferenceRow;
use crate::model::{Artist, Membership};
use crate::write::Tenure;

#[infra_db::observe("artist.load_with_relations")]
async fn find_many_impl(
    select: Select<artist::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<Artist>, DatabaseError> {
    let artists = select.all(db).await.db_context("load artists")?;

    let ids = artists.iter().map(|x| x.id).unique().collect_vec();

    if ids.is_empty() {
        return Ok(vec![]);
    }

    let aliases = artist_alias::Entity::find()
        .filter(any![
            artist_alias::Column::FirstId.is_in(ids.iter().copied()),
            artist_alias::Column::SecondId.is_in(ids.iter().copied()),
        ])
        .all(db)
        .await
        .db_context("load artist aliases")?;

    let alias_artists_by_id = artist::Entity::find()
        .filter(
            artist::Column::Id.is_in(
                aliases
                    .iter()
                    .flat_map(|alias| [alias.first_id, alias.second_id]),
            ),
        )
        .into_partial_model::<ArtistReferenceRow>()
        .all(db)
        .await
        .db_context("load artist alias names")?
        .into_iter()
        .map(|artist| (artist.id, SimpleArtist::from(artist)))
        .collect::<HashMap<_, _>>();

    let artist_images = artist_image::Entity::find()
        .filter(artist_image::Column::ArtistId.is_in(ids.iter().copied()))
        .find_also_related(image::Entity)
        .order_by_desc(image::Column::UploadedAt)
        .order_by_desc(image::Column::Id)
        .all(db)
        .await
        .db_context("load artist images")?;

    let mut images_map: HashMap<i32, Vec<_>> = artist_images.into_iter().fold(
        HashMap::new(),
        |mut acc, (artist_image, image)| {
            let Some(image) = image else {
                return acc;
            };

            acc.entry(artist_image.artist_id)
                .or_default()
                .push((artist_image.r#type, image));
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

    let links = artists
        .load_many(artist_link::Entity, db)
        .await
        .db_context("load artist links")?;
    let localized_names = artists
        .load_many(artist_localized_name::Entity, db)
        .await
        .db_context("load artist localized names")?;

    let artist_memberships = artist_membership::Entity::find()
        .filter(any![
            artist_membership::Column::MemberId.is_in(ids.iter().copied()),
            artist_membership::Column::GroupId.is_in(ids.iter().copied()),
        ])
        .all(db)
        .await
        .db_context("load artist memberships")?;

    let membership_artists_by_id = artist::Entity::find()
        .filter(
            artist::Column::Id.is_in(
                artist_memberships
                    .iter()
                    .flat_map(|membership| {
                        [membership.group_id, membership.member_id]
                    })
                    .unique(),
            ),
        )
        .into_partial_model::<ArtistReferenceRow>()
        .all(db)
        .await
        .db_context("load membership artists")?
        .into_iter()
        .map(|artist| (artist.id, SimpleArtist::from(artist)))
        .collect::<HashMap<_, _>>();

    let roles = artist_memberships
        .load_many_to_many(
            credit_role::Entity,
            artist_membership_role::Entity,
            db,
        )
        .await
        .db_context("load artist membership roles")?;

    let join_leaves = artist_memberships
        .load_many(artist_membership_tenure::Entity, db)
        .await
        .db_context("load artist membership tenures")?;

    let group_association =
        izip!(artist_memberships, roles, join_leaves).collect_vec();

    let langs = language::Entity::find()
        .filter(
            language::Column::Id.is_in(
                localized_names
                    .iter()
                    .flat_map(|x| x.iter().map(|x| x.language_id)),
            ),
        )
        .all(db)
        .await
        .db_context("load artist localized name languages")?;

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
                .map(|id| alias_artists_by_id[&id].clone())
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

            let memberships = group_association
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

                    Membership {
                        artist: membership_artists_by_id[&artist_id].clone(),
                        roles: role
                            .iter()
                            .map(|x| CreditRoleRef {
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
                .find(|(image_type, _)| *image_type == ArtistImageType::Profile)
                .map(|(_, image)| image.object_key.clone());

            Artist {
                id: artist.id,
                name: artist.name,
                artist_type: artist.artist_type,
                text_aliases: artist.text_alias,
                start_date,
                end_date,

                aliases,
                links: links.into_iter().map(|x| x.url).collect_vec(),
                localized_names,
                start_location: Location {
                    country: artist.start_location_country,
                    province: artist.start_location_province,
                    city: artist.start_location_city,
                },
                current_location: Location {
                    country: artist.current_location_country,
                    province: artist.current_location_province,
                    city: artist.current_location_city,
                },
                memberships,
                profile_image_url,
            }
        })
        .collect_vec();

    Ok(ret)
}

fn common_filter(
    artist_types: Option<EnumSet<ArtistType>>,
    exclusion: Option<Vec<i32>>,
) -> SimpleExpr {
    Cond::all()
        .add_option(artist_types.map(|x| artist::Column::ArtistType.is_in(x)))
        .add_option(exclusion.and_then(|x| {
            if x.is_empty() {
                None
            } else {
                Some(artist::Column::Id.is_not_in(x))
            }
        }))
        .into()
}

#[infra_db::observe("artist.find_by_id")]
pub async fn find_one(
    db: &impl ConnectionTrait,
    id: i32,
    artist_types: Option<EnumSet<ArtistType>>,
    exclusion: Option<Vec<i32>>,
) -> Result<Option<Artist>, DatabaseError> {
    let select = artist::Entity::find()
        .filter(artist::Column::Id.eq(id))
        .filter(common_filter(artist_types, exclusion));

    let artists = find_many_impl(select, db).await?;
    Ok(artists.into_iter().next())
}

#[infra_db::observe("artist.find_by_keyword")]
pub async fn find_many(
    db: &impl ConnectionTrait,
    keyword: &str,
    artist_types: Option<EnumSet<ArtistType>>,
    exclusion: Option<Vec<i32>>,
) -> Result<Vec<Artist>, DatabaseError> {
    let search_term = Func::lower(keyword);

    let select = artist::Entity::find()
        .filter(
            Func::lower(artist::Column::Name.into_expr())
                .binary(PgBinOper::Similarity, search_term.clone()),
        )
        .filter(common_filter(artist_types, exclusion))
        .order_by_asc(
            Func::lower(artist::Column::Name.into_expr())
                .binary(PgBinOper::SimilarityDistance, search_term),
        );

    Ok(find_many_impl(select, db).await?)
}
