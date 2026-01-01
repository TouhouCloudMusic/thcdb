use std::collections::HashMap;
use std::path::PathBuf;

use entity::sea_orm_active_enums::ArtistImageType;
use entity::{
    artist, artist_alias, artist_image, artist_link, artist_localized_name,
    artist_membership, artist_membership_role, artist_membership_tenure,
    credit_role, image, language,
};
use itertools::{Itertools, izip};
use sea_orm::{
    ColumnTrait, Condition, ConnectionTrait, DbErr, EntityTrait,
    FromQueryResult, LoaderTrait, QueryFilter, QueryOrder, Select,
};
use sea_query::extension::postgres::PgBinOper;
use sea_query::{ExprTrait, Func, SimpleExpr};

use super::{CommonFilter, FindManyFilter};
use crate::domain::Connection;
use crate::domain::artist::{Artist, Membership, Tenure};
use crate::domain::credit_role::CreditRoleRef;
use crate::domain::shared::{LocalizedName, Location};
use crate::infra::database::sea_orm::utils;

pub(super) async fn find_one<R>(
    repo: &R,
    id: i32,
    common: CommonFilter,
) -> Result<Option<Artist>, DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
    let select = artist::Entity::find()
        .filter(artist::Column::Id.eq(id))
        .filter(SimpleExpr::from(common));

    find_many_impl(select, repo.conn())
        .await
        .map(|x| x.into_iter().next())
}

pub(super) async fn find_many<R>(
    repo: &R,
    filter: FindManyFilter,
    common: CommonFilter,
) -> Result<Vec<Artist>, DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
    let FindManyFilter::Keyword(keyword) = &filter;

    let search_term = Func::lower(keyword);

    let select = artist::Entity::find()
        .filter(
            Func::lower(artist::Column::Name.into_expr())
                .binary(PgBinOper::Similarity, search_term.clone()),
        )
        .filter(SimpleExpr::from(common))
        .order_by_asc(
            Func::lower(artist::Column::Name.into_expr())
                .binary(PgBinOper::SimilarityDistance, search_term),
        );

    find_many_impl(select, repo.conn()).await
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
    select: Select<artist::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<Artist>, DbErr> {
    let artists = select.all(db).await?;

    let ids = artists.iter().map(|x| x.id).unique().collect_vec();

    if ids.is_empty() {
        return Ok(vec![]);
    }

    let aliases = artist_alias::Entity::find()
        .filter(
            Condition::any()
                .add(artist_alias::Column::FirstId.is_in(ids.iter().copied()))
                .add(artist_alias::Column::SecondId.is_in(ids.iter().copied())),
        )
        .all(db)
        .await?;

    let artist_images = artist_image::Entity::find()
        .filter(artist_image::Column::ArtistId.is_in(ids.iter().copied()))
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

    let artist_memberships = artist_membership::Entity::find()
        .filter(
            Condition::any()
                .add(
                    artist_membership::Column::MemberId
                        .is_in(ids.iter().copied()),
                )
                .add(artist_membership::Column::GroupId.is_in(ids)),
        )
        .all(db)
        .await?;

    let roles = artist_memberships
        .load_many_to_many(
            credit_role::Entity,
            artist_membership_role::Entity,
            db,
        )
        .await?;

    let join_leaves = artist_memberships
        .load_many(artist_membership_tenure::Entity, db)
        .await?;

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
                        artist_id,
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
                .find(|x| x.r#type == ArtistImageType::Profile)
                .map(|x| {
                    let image = &x.image;
                    PathBuf::from_iter([&image.directory, &image.filename])
                        .to_string_lossy()
                        .to_string()
                });

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

pub(super) async fn find_by_filter<R>(
    repo: &R,
    filter: super::ArtistFilter,
    pagination: crate::shared::http::PaginationQuery,
) -> Result<crate::domain::shared::Paginated<Artist>, DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
    if let (Some(sort_field), Some(sort_direction)) =
        (filter.sort_field, filter.sort_direction)
    {
        return find_sorted_by_correction(
            repo,
            filter,
            sort_field,
            sort_direction,
            pagination,
        )
        .await;
    }

    let select = filter.into_select();
    utils::find_many_paginated(
        select,
        pagination,
        artist::Column::Id,
        |select| find_many_impl(select, repo.conn()),
        |artist: &Artist| artist.id,
    )
    .await
}

async fn find_sorted_by_correction<R>(
    repo: &R,
    filter: super::ArtistFilter,
    sort_field: crate::shared::http::CorrectionSortField,
    sort_direction: crate::shared::http::SortDirection,
    pagination: crate::shared::http::PaginationQuery,
) -> Result<crate::domain::shared::Paginated<Artist>, DbErr>
where
    R: Connection,
    R::Conn: ConnectionTrait,
{
    use entity::enums::EntityType;

    use crate::shared::http::SortDirection;

    let entity_ids =
        crate::infra::database::sea_orm::utils::correction_sorted_entity_ids(
            repo.conn(),
            EntityType::Artist,
            sort_field,
            match sort_direction {
                SortDirection::Asc => sea_orm::Order::Asc,
                SortDirection::Desc => sea_orm::Order::Desc,
            },
        )
        .await?;

    if entity_ids.is_empty() {
        return Ok(crate::domain::shared::Paginated::nothing());
    }

    let mut select = artist::Entity::find()
        .filter(artist::Column::Id.is_in(entity_ids.clone()));

    if let Some(artist_types) = filter.artist_types {
        select = select.filter(artist::Column::ArtistType.is_in(artist_types));
    }

    let mut artists = find_many_impl(select, repo.conn()).await?;

    artists = crate::infra::database::sea_orm::utils::sort_by_id_list(
        artists,
        &entity_ids,
        |artist| artist.id,
    );

    Ok(utils::paginate_by_id(artists, &pagination, |artist| {
        artist.id
    }))
}
