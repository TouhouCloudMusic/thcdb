use entity::enums::ArtistType;
use entity::{
    artist, artist_alias, artist_alias_history, artist_history, artist_link,
    artist_link_history, artist_localized_name, artist_localized_name_history,
    artist_membership, artist_membership_history, artist_membership_role,
    artist_membership_role_history, artist_membership_tenure,
    artist_membership_tenure_history,
};
use infra_db::DatabaseTransaction;
use infra_db::error::{BrokenEntityReference, DatabaseError};
use itertools::Itertools;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DbErr, EntityTrait,
    LoaderTrait, QueryFilter, QueryOrder,
};
use sea_query::any;
use serde_json::{Value, json};

const fn date_precision_string(
    precision: entity::sea_orm_active_enums::DatePrecision,
) -> &'static str {
    match precision {
        entity::sea_orm_active_enums::DatePrecision::Day => "Day",
        entity::sea_orm_active_enums::DatePrecision::Month => "Month",
        entity::sea_orm_active_enums::DatePrecision::Year => "Year",
    }
}

fn date_with_precision(
    value: Option<chrono::NaiveDate>,
    precision: Option<entity::sea_orm_active_enums::DatePrecision>,
) -> Value {
    match (value, precision) {
        (Some(value), Some(precision)) => json!({
            "value": value,
            "precision": date_precision_string(precision),
        }),
        _ => Value::Null,
    }
}

fn location_value(
    country: Option<&str>,
    province: Option<&str>,
    city: Option<&str>,
) -> Value {
    if country.is_none() && province.is_none() && city.is_none() {
        Value::Null
    } else {
        json!({
            "country": country,
            "province": province,
            "city": city,
        })
    }
}

#[fastrace::trace(name = "correction.snapshot_artist")]
pub async fn load_history_snapshot(
    db: &impl ConnectionTrait,
    history_id: i32,
) -> Result<Value, DbErr> {
    let history = artist_history::Entity::find_by_id(history_id)
        .one(db)
        .await?
        .ok_or_else(|| DbErr::Custom("Artist history not found".to_string()))?;

    let aliases = artist_alias_history::Entity::find()
        .filter(artist_alias_history::Column::HistoryId.eq(history_id))
        .order_by_asc(artist_alias_history::Column::AliasId)
        .all(db)
        .await?
        .into_iter()
        .map(|model| model.alias_id)
        .collect::<Vec<_>>();

    let links = artist_link_history::Entity::find()
        .filter(artist_link_history::Column::HistoryId.eq(history_id))
        .all(db)
        .await?
        .into_iter()
        .map(|model| model.url)
        .collect::<Vec<_>>();

    let localized_names = artist_localized_name_history::Entity::find()
        .filter(artist_localized_name_history::Column::HistoryId.eq(history_id))
        .order_by_asc(artist_localized_name_history::Column::Id)
        .all(db)
        .await?
        .into_iter()
        .map(|model| {
            json!({
                "language_id": model.language_id,
                "name": model.name,
            })
        })
        .collect::<Vec<_>>();

    let memberships = artist_membership_history::Entity::find()
        .filter(artist_membership_history::Column::HistoryId.eq(history_id))
        .order_by_asc(artist_membership_history::Column::Id)
        .all(db)
        .await?;

    let roles = memberships
        .load_many(artist_membership_role_history::Entity, db)
        .await?;
    let tenures = memberships
        .load_many(artist_membership_tenure_history::Entity, db)
        .await?;

    let membership_values = memberships
        .iter()
        .zip(roles)
        .zip(tenures)
        .map(|((membership, role_history), tenure_history)| {
            let roles = role_history
                .into_iter()
                .map(|role| role.role_id)
                .collect::<Vec<_>>();
            let tenures = tenure_history
                .into_iter()
                .map(|tenure| {
                    json!({
                        "join_year": tenure.join_year,
                        "leave_year": tenure.leave_year,
                    })
                })
                .collect::<Vec<_>>();
            json!({
                "artist_id": membership.artist_id,
                "roles": roles,
                "tenures": tenures,
            })
        })
        .collect::<Vec<_>>();

    Ok(json!({
        "name": history.name,
        "artist_type": history.artist_type,
        "text_alias": history.text_alias,
        "start_date": date_with_precision(
            history.start_date,
            history.start_date_precision,
        ),
        "end_date": date_with_precision(
            history.end_date,
            history.end_date_precision,
        ),
        "start_location": location_value(
            history.start_location_country.as_deref(),
            history.start_location_province.as_deref(),
            history.start_location_city.as_deref(),
        ),
        "current_location": location_value(
            history.current_location_country.as_deref(),
            history.current_location_province.as_deref(),
            history.current_location_city.as_deref(),
        ),
        "links": links,
        "aliases": aliases,
        "localized_names": localized_names,
        "memberships": membership_values,
    }))
}

async fn update_artist_aliases(
    artist_id: i32,
    history_id: i32,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    infra_db::trace("artist.update_aliases", async {
        artist_alias::Entity::delete_many()
            .filter(any![
                artist_alias::Column::FirstId.eq(artist_id),
                artist_alias::Column::SecondId.eq(artist_id),
            ])
            .exec(db)
            .await?;

        let aliases = artist_alias_history::Entity::find()
            .filter(artist_alias_history::Column::HistoryId.eq(history_id))
            .all(db)
            .await?;

        let models = aliases
            .into_iter()
            .map(|x| x.alias_id)
            .map(|alias_id| artist_alias::ActiveModel {
                first_id: Set(alias_id.min(artist_id)),
                second_id: Set(alias_id.max(artist_id)),
            })
            .collect_vec();

        // TODO: Remove this guard after upgrading to SeaORM 2.0 (sea-orm#2628).
        if !models.is_empty() {
            artist_alias::Entity::insert_many(models).exec(db).await?;
        }

        Ok(())
    })
    .await
}

async fn update_artist_links(
    artist_id: i32,
    history_id: i32,
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    infra_db::trace("artist.update_links", async {
        artist_link::Entity::delete_many()
            .filter(artist_link::Column::ArtistId.eq(artist_id))
            .exec(db)
            .await?;

        let links = artist_link_history::Entity::find()
            .filter(artist_link_history::Column::HistoryId.eq(history_id))
            .all(db)
            .await?;

        if links.is_empty() {
            return Ok(());
        }

        let model = links
            .into_iter()
            .map(|x| x.url)
            .map(|x| artist_link::ActiveModel {
                artist_id: Set(artist_id),
                id: NotSet,
                url: Set(x),
            })
            .collect::<Vec<_>>();

        artist_link::Entity::insert_many(model).exec(db).await?;

        Ok(())
    })
    .await
}

async fn update_artist_localized_names(
    artist_id: i32,
    history_id: i32,
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    infra_db::trace("artist.update_localized_names", async {
        artist_localized_name::Entity::delete_many()
            .filter(artist_localized_name::Column::ArtistId.eq(artist_id))
            .exec(db)
            .await?;

        let localized_names = artist_localized_name_history::Entity::find()
            .filter(
                artist_localized_name_history::Column::HistoryId.eq(history_id),
            )
            .all(db)
            .await?;

        let models = localized_names
            .into_iter()
            .map(|x| artist_localized_name::ActiveModel {
                id: NotSet,
                artist_id: Set(artist_id),
                language_id: Set(x.language_id),
                name: Set(x.name),
            })
            .collect::<Vec<_>>();

        // TODO: Remove this guard after upgrading to SeaORM 2.0 (sea-orm#2628).
        if !models.is_empty() {
            artist_localized_name::Entity::insert_many(models)
                .exec(db)
                .await?;
        }

        Ok(())
    })
    .await
}

#[fastrace::trace(name = "artist.update_memberships")]
async fn update_artist_artist_membership(
    artist_id: i32,
    history_id: i32,
    artist_type: ArtistType,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    // artist_membership_role and artist_membership_tenure are deleted by database cascade
    artist_membership::Entity::delete_many()
        .filter(any![
            artist_membership::Column::MemberId.eq(artist_id),
            artist_membership::Column::GroupId.eq(artist_id),
        ])
        .exec(db)
        .await?;

    if artist_type == ArtistType::Unknown {
        return Ok(());
    }

    let artist_membership = artist_membership_history::Entity::find()
        .filter(artist_membership_history::Column::HistoryId.eq(history_id))
        .all(db)
        .await?;

    if artist_membership.is_empty() {
        // TODO: Remove this guard after upgrading to SeaORM 2.0 (sea-orm#2628).
        return Ok(());
    }

    let artist_membership_role = artist_membership
        .load_many(artist_membership_role_history::Entity, db)
        .await?;

    let artist_membership_tenure = artist_membership
        .load_many(artist_membership_tenure_history::Entity, db)
        .await?;

    let artist_membership_models =
        artist_membership.iter().map(|artist_membership_history| {
            let (group_id, member_id) = if artist_type.is_multiple() {
                (artist_id, artist_membership_history.artist_id)
            } else {
                (artist_membership_history.artist_id, artist_id)
            };

            artist_membership::ActiveModel {
                id: NotSet,
                group_id: Set(group_id),
                member_id: Set(member_id),
            }
        });

    let new_memberships =
        artist_membership::Entity::insert_many(artist_membership_models)
            .exec_with_returning_many(db)
            .await?;

    let role_models = new_memberships
        .iter()
        .zip(artist_membership_role.iter())
        .flat_map(|(membership, role_history)| {
            role_history.iter().map(|role| {
                artist_membership_role::ActiveModel {
                    membership_id: Set(membership.id),
                    role_id: Set(role.role_id),
                }
            })
        })
        .collect_vec();

    // TODO: Remove this guard after upgrading to SeaORM 2.0 (sea-orm#2628).
    if !role_models.is_empty() {
        artist_membership_role::Entity::insert_many(role_models)
            .exec(db)
            .await?;
    }

    let tenure_models = new_memberships
        .iter()
        .zip(artist_membership_tenure.iter())
        .flat_map(|(membership, tenure_history)| {
            tenure_history.iter().map(|tenure| {
                artist_membership_tenure::ActiveModel {
                    id: NotSet,
                    membership_id: Set(membership.id),
                    join_year: Set(tenure.join_year),
                    leave_year: Set(tenure.leave_year),
                }
            })
        })
        .collect_vec();

    // TODO: Remove this guard after upgrading to SeaORM 2.0 (sea-orm#2628).
    if !tenure_models.is_empty() {
        artist_membership_tenure::Entity::insert_many(tenure_models)
            .exec(db)
            .await?;
    }

    Ok(())
}

#[infra_db::observe("artist.apply_update")]
pub async fn apply_history(
    db: &DatabaseTransaction,
    artist_id: i32,
    history_id: i32,
) -> Result<(), DatabaseError> {
    let history = artist_history::Entity::find_by_id(history_id)
        .one(db)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "artist history",
            id: history_id,
        })?;

    artist::ActiveModel {
        id: Set(artist_id),
        name: Set(history.name),
        artist_type: Set(history.artist_type),
        text_alias: Set(history.text_alias),
        start_date: Set(history.start_date),
        start_date_precision: Set(history.start_date_precision),
        end_date: Set(history.end_date),
        end_date_precision: Set(history.end_date_precision),
        current_location_country: Set(history.current_location_country),
        current_location_province: Set(history.current_location_province),
        current_location_city: Set(history.current_location_city),
        start_location_country: Set(history.start_location_country),
        start_location_province: Set(history.start_location_province),
        start_location_city: Set(history.start_location_city),
    }
    .update(db)
    .await?;

    update_artist_aliases(artist_id, history_id, db).await?;
    update_artist_links(artist_id, history_id, db).await?;
    update_artist_localized_names(artist_id, history_id, db).await?;
    update_artist_artist_membership(
        artist_id,
        history_id,
        history.artist_type,
        db,
    )
    .await?;

    Ok(())
}
