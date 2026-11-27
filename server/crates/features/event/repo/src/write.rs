use domain::shared::{DateWithPrecision, EntityIdent, HttpUrl, Location};
use entity::sea_orm_active_enums::AlternativeNameType;
use entity::{
    event, event_alternative_name, event_alternative_name_history,
    event_history, event_link, event_link_history,
};
use garde::Validate;
use infra_db::DatabaseTransaction;
use infra_db::error::DatabaseError;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ActiveModelTrait, DbErr, EntityTrait, IntoActiveValue};
use sea_query::OnConflict;
use serde::Deserialize;
use utoipa::ToSchema;

fn validate_end_date(
    start: Option<&DateWithPrecision>,
) -> impl FnOnce(&Option<DateWithPrecision>, &()) -> garde::Result + '_ {
    move |end, ()| match (start, end.as_ref()) {
        (_, None) => Ok(()),
        (Some(start), Some(end)) => {
            if end.value > start.value {
                Ok(())
            } else {
                Err(garde::Error::new("end_date must be later than start_date"))
            }
        }
        (None, Some(_)) => Err(garde::Error::new(
            "end_date requires start_date when provided",
        )),
    }
}

#[derive(Validate, Deserialize, ToSchema)]
pub struct NewEvent {
    #[garde(skip)]
    pub name: EntityIdent,
    #[garde(skip)]
    pub short_description: Option<String>,
    #[garde(skip)]
    pub description: Option<String>,
    #[garde(skip)]
    pub location: Option<Location>,
    #[garde(skip)]
    pub start_date: Option<DateWithPrecision>,
    #[garde(custom(validate_end_date(self.start_date.as_ref())))]
    pub end_date: Option<DateWithPrecision>,
    #[garde(skip)]
    pub alternative_names: Option<Vec<String>>,
    #[garde(skip)]
    pub links: Option<Vec<HttpUrl>>,
}

impl From<&NewEvent> for event::ActiveModel {
    fn from(data: &NewEvent) -> Self {
        Self {
            id: NotSet,
            name: Set(data.name.to_string()),
            short_description: Set(data
                .short_description
                .clone()
                .unwrap_or_default()),
            description: Set(data.description.clone().unwrap_or_default()),
            start_date: Set(data.start_date.map(|d| d.value)),
            start_date_precision: data
                .start_date
                .map(|d| d.precision)
                .into_active_value(),
            end_date: Set(data.end_date.map(|d| d.value)),
            end_date_precision: data
                .end_date
                .map(|d| d.precision)
                .into_active_value(),
            location_country: Set(data
                .location
                .as_ref()
                .and_then(|l| l.country.clone())),
            location_province: Set(data
                .location
                .as_ref()
                .and_then(|l| l.province.clone())),
            location_city: Set(data
                .location
                .as_ref()
                .and_then(|l| l.city.clone())),
        }
    }
}

impl From<&NewEvent> for event_history::ActiveModel {
    fn from(data: &NewEvent) -> Self {
        Self {
            id: NotSet,
            name: Set(data.name.to_string()),
            short_description: Set(data
                .short_description
                .clone()
                .unwrap_or_default()),
            description: Set(data.description.clone().unwrap_or_default()),
            start_date: Set(data.start_date.map(|d| d.value)),
            start_date_precision: data
                .start_date
                .map(|d| d.precision)
                .into_active_value(),
            end_date: Set(data.end_date.map(|d| d.value)),
            end_date_precision: data
                .end_date
                .map(|d| d.precision)
                .into_active_value(),
            location_country: Set(data
                .location
                .as_ref()
                .and_then(|l| l.country.clone())),
            location_province: Set(data
                .location
                .as_ref()
                .and_then(|l| l.province.clone())),
            location_city: Set(data
                .location
                .as_ref()
                .and_then(|l| l.city.clone())),
        }
    }
}

async fn create_alt_names(
    event_id: i32,
    alt_names: &[String],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if alt_names.is_empty() {
        return Ok(());
    }

    let models =
        alt_names
            .iter()
            .map(|name| event_alternative_name::ActiveModel {
                id: NotSet,
                event_id: Set(event_id),
                name: Set(name.clone()),
                r#type: Set(AlternativeNameType::Alias),
                language_id: Set(Option::<i32>::None),
            });

    event_alternative_name::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn create_alt_names_history(
    history_id: i32,
    alt_names: &[String],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if alt_names.is_empty() {
        return Ok(());
    }

    let models = alt_names.iter().map(|name| {
        event_alternative_name_history::ActiveModel {
            id: NotSet,
            history_id: Set(history_id),
            name: Set(name.clone()),
            r#type: Set(AlternativeNameType::Alias),
            language_id: Set(Option::<i32>::None),
        }
    });

    event_alternative_name_history::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn create_links(
    event_id: i32,
    links: Option<&[HttpUrl]>,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let Some(links) = links.filter(|links| !links.is_empty()) else {
        return Ok(());
    };

    let models = links.iter().map(|link| event_link::ActiveModel {
        id: NotSet,
        event_id: Set(event_id),
        url: Set(link.to_string()),
    });

    event_link::Entity::insert_many(models)
        .on_conflict(
            OnConflict::columns([
                event_link::Column::EventId,
                event_link::Column::Url,
            ])
            .do_nothing()
            .to_owned(),
        )
        .on_empty_do_nothing()
        .exec_without_returning(tx)
        .await?;

    Ok(())
}

async fn create_link_histories(
    history_id: i32,
    links: Option<&[HttpUrl]>,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let Some(links) = links.filter(|links| !links.is_empty()) else {
        return Ok(());
    };

    let models = links.iter().map(|link| event_link_history::ActiveModel {
        id: NotSet,
        history_id: Set(history_id),
        url: Set(link.to_string()),
    });

    event_link_history::Entity::insert_many(models)
        .on_conflict(
            OnConflict::columns([
                event_link_history::Column::HistoryId,
                event_link_history::Column::Url,
            ])
            .do_nothing()
            .to_owned(),
        )
        .on_empty_do_nothing()
        .exec_without_returning(tx)
        .await?;

    Ok(())
}

async fn create_event_and_relations(
    data: &NewEvent,
    tx: &DatabaseTransaction,
) -> Result<event::Model, DbErr> {
    infra_db::trace("event.insert_with_relations", async {
        let event = event::ActiveModel::from(data).insert(tx).await?;

        if let Some(alt_names) = &data.alternative_names {
            create_alt_names(event.id, alt_names, tx).await?;
        }
        create_links(event.id, data.links.as_deref(), tx).await?;

        Ok(event)
    })
    .await
}

async fn create_event_history_and_relations(
    data: &NewEvent,
    tx: &DatabaseTransaction,
) -> Result<event_history::Model, DbErr> {
    infra_db::trace("event.insert_history_with_relations", async {
        let history = event_history::ActiveModel::from(data).insert(tx).await?;

        if let Some(alt_names) = &data.alternative_names {
            create_alt_names_history(history.id, alt_names, tx).await?;
        }
        create_link_histories(history.id, data.links.as_deref(), tx).await?;

        Ok(history)
    })
    .await
}

/// Inserts the current event in the caller's transaction.
///
/// Validate `data` before calling this function.
#[infra_db::observe("event.create")]
pub async fn create(
    tx: &DatabaseTransaction,
    data: &NewEvent,
) -> Result<i32, DatabaseError> {
    Ok(create_event_and_relations(data, tx)
        .await
        .map(|event| event.id)?)
}

/// Inserts an event snapshot in the caller's transaction.
///
/// Validate `data` before calling this function.
#[infra_db::observe("event.create_history")]
pub async fn create_history(
    tx: &DatabaseTransaction,
    data: &NewEvent,
) -> Result<i32, DatabaseError> {
    Ok(create_event_history_and_relations(data, tx)
        .await
        .map(|event| event.id)?)
}
