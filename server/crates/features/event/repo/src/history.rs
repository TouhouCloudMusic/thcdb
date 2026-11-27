use domain::shared::DateWithPrecision;
use entity::{
    event, event_alternative_name, event_alternative_name_history,
    event_history, event_link, event_link_history,
};
use infra_db::DatabaseTransaction;
use infra_db::error::{BrokenEntityReference, DatabaseError};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DbErr, EntityTrait,
    QueryFilter, QueryOrder,
};
use serde_json::{Value, json};

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

pub async fn load_history_snapshot(
    db: &impl ConnectionTrait,
    history_id: i32,
) -> Result<Value, DbErr> {
    infra_db::trace("correction.snapshot_event", async {
        let history = event_history::Entity::find_by_id(history_id)
            .one(db)
            .await?
            .ok_or_else(|| {
                DbErr::Custom("Event history not found".to_string())
            })?;

        let alternative_names = event_alternative_name_history::Entity::find()
            .filter(
                event_alternative_name_history::Column::HistoryId
                    .eq(history_id),
            )
            .order_by_asc(event_alternative_name_history::Column::Id)
            .all(db)
            .await?
            .into_iter()
            .map(|model| model.name)
            .collect::<Vec<_>>();

        let links = event_link_history::Entity::find()
            .filter(event_link_history::Column::HistoryId.eq(history_id))
            .all(db)
            .await?
            .into_iter()
            .map(|model| model.url)
            .collect::<Vec<_>>();

        Ok(json!({
            "name": history.name,
            "description": history.description,
            "short_description": history.short_description,
            "start_date": DateWithPrecision::from_option(
                history.start_date,
                history.start_date_precision,
            ),
            "end_date": DateWithPrecision::from_option(
                history.end_date,
                history.end_date_precision,
            ),
            "location": location_value(
                history.location_country.as_deref(),
                history.location_province.as_deref(),
                history.location_city.as_deref(),
            ),
            "alternative_names": alternative_names,
            "links": links,
        }))
    })
    .await
}

async fn update_alt_names(
    event_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    infra_db::trace("event.update_alt_names", async {
        event_alternative_name::Entity::delete_many()
            .filter(event_alternative_name::Column::EventId.eq(event_id))
            .exec(tx)
            .await?;

        let alt_names = event_alternative_name_history::Entity::find()
            .filter(
                event_alternative_name_history::Column::HistoryId
                    .eq(history_id),
            )
            .all(tx)
            .await?;

        if alt_names.is_empty() {
            return Ok(());
        }

        let models = alt_names.iter().map(|alt_name| {
            event_alternative_name::ActiveModel {
                id: NotSet,
                event_id: Set(event_id),
                name: Set(alt_name.name.clone()),
                r#type: Set(alt_name.r#type),
                language_id: Set(alt_name.language_id),
            }
        });

        event_alternative_name::Entity::insert_many(models)
            .exec(tx)
            .await?;

        Ok(())
    })
    .await
}

async fn update_links(
    event_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    infra_db::trace("event.update_links", async {
        event_link::Entity::delete_many()
            .filter(event_link::Column::EventId.eq(event_id))
            .exec(tx)
            .await?;

        let links = event_link_history::Entity::find()
            .filter(event_link_history::Column::HistoryId.eq(history_id))
            .all(tx)
            .await?;

        if links.is_empty() {
            return Ok(());
        }

        let models = links.into_iter().map(|link| event_link::ActiveModel {
            id: NotSet,
            event_id: Set(event_id),
            url: Set(link.url),
        });

        event_link::Entity::insert_many(models).exec(tx).await?;

        Ok(())
    })
    .await
}

#[infra_db::observe("event.apply_update")]
pub async fn apply_history(
    tx: &DatabaseTransaction,
    event_id: i32,
    history_id: i32,
) -> Result<(), DatabaseError> {
    let history = event_history::Entity::find_by_id(history_id)
        .one(tx)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "event history",
            id: history_id,
        })?;

    let active_model = event::ActiveModel {
        id: Set(event_id),
        name: Set(history.name),
        short_description: Set(history.short_description),
        description: Set(history.description),
        start_date: Set(history.start_date),
        start_date_precision: Set(history.start_date_precision),
        end_date: Set(history.end_date),
        end_date_precision: Set(history.end_date_precision),
        location_country: Set(history.location_country),
        location_province: Set(history.location_province),
        location_city: Set(history.location_city),
    };

    active_model.update(tx).await?;
    update_alt_names(event_id, history_id, tx).await?;
    update_links(event_id, history_id, tx).await?;

    Ok(())
}
