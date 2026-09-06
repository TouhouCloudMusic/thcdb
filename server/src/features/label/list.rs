use std::collections::HashMap;

use domain::shared::{DateWithPrecision, LocalizedName, SimpleArtist};
use entity::sea_orm_active_enums::DatePrecision;
use entity::{artist, label, label_founder, label_localized_name, language};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DerivePartialModel, EntityTrait, JoinType,
    QueryFilter, QuerySelect, RelationTrait, Select,
};
use serde::Serialize;
use utoipa::ToSchema;

use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

#[derive(Clone, Debug, Serialize, ToSchema)]
pub(crate) struct LabelListItem {
    pub id: i32,
    pub name: String,
    pub localized_names: Vec<LocalizedName>,
    pub founders: Vec<SimpleArtist>,
    pub founded_date: Option<DateWithPrecision>,
}

#[derive(DerivePartialModel)]
#[sea_orm(entity = "label::Entity", from_query_result)]
pub(crate) struct LabelRow {
    id: i32,
    name: String,
    founded_date: Option<chrono::NaiveDate>,
    founded_date_precision: DatePrecision,
}

pub(crate) async fn load(
    select: Select<label::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<LabelListItem>, DatabaseError> {
    let labels = select
        .into_partial_model::<LabelRow>()
        .all(db)
        .await
        .db_operation("load label list items")?;

    load_items(labels, db).await
}

/// Loads list associations and returns one item per row in the same order.
pub(crate) async fn load_items(
    labels: Vec<LabelRow>,
    db: &impl ConnectionTrait,
) -> Result<Vec<LabelListItem>, DatabaseError> {
    let label_ids = labels.iter().map(|label| label.id).collect::<Vec<_>>();

    if label_ids.is_empty() {
        return Ok(Vec::new());
    }

    let founder_rows = label_founder::Entity::find()
        .select_only()
        .column(label_founder::Column::LabelId)
        .column(artist::Column::Id)
        .column(artist::Column::Name)
        .join(JoinType::InnerJoin, label_founder::Relation::Artist.def())
        .filter(label_founder::Column::LabelId.is_in(label_ids.iter().copied()))
        .into_tuple::<(i32, i32, String)>()
        .all(db)
        .await
        .db_operation("load label list founders")?;
    let mut founders: HashMap<i32, Vec<SimpleArtist>> = HashMap::new();
    for (label_id, id, name) in founder_rows {
        founders
            .entry(label_id)
            .or_default()
            .push(SimpleArtist { id, name });
    }

    let localized_name_rows = label_localized_name::Entity::find()
        .find_also_related(language::Entity)
        .filter(
            label_localized_name::Column::LabelId
                .is_in(label_ids.iter().copied()),
        )
        .all(db)
        .await
        .db_operation("load label list localized names")?;
    let mut localized_names: HashMap<i32, Vec<LocalizedName>> = HashMap::new();
    for (name, language) in localized_name_rows {
        if let Some(language) = language {
            localized_names.entry(name.label_id).or_default().push(
                LocalizedName {
                    name: name.name,
                    language: language.into(),
                },
            );
        }
    }

    Ok(labels
        .into_iter()
        .map(|label| LabelListItem {
            id: label.id,
            name: label.name,
            localized_names: localized_names
                .remove(&label.id)
                .unwrap_or_default(),
            founders: founders.remove(&label.id).unwrap_or_default(),
            founded_date: DateWithPrecision::from_option(
                label.founded_date,
                label.founded_date_precision,
            ),
        })
        .collect())
}
