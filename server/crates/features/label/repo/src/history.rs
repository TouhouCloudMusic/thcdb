use domain::shared::DateWithPrecision;
use entity::{
    label_founder_history, label_history, label_link_history,
    label_localized_name_history,
};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, QueryFilter, QueryOrder,
};
use serde_json::{Value, json};

pub async fn load_history_snapshot(
    db: &impl ConnectionTrait,
    history_id: i32,
) -> Result<Value, DbErr> {
    infra_db::trace("correction.snapshot_label", async {
        let history = label_history::Entity::find_by_id(history_id)
            .one(db)
            .await?
            .ok_or_else(|| {
                DbErr::Custom("Label history not found".to_string())
            })?;

        let founders = label_founder_history::Entity::find()
            .filter(label_founder_history::Column::HistoryId.eq(history_id))
            .order_by_asc(label_founder_history::Column::ArtistId)
            .all(db)
            .await?
            .into_iter()
            .map(|model| model.artist_id)
            .collect::<Vec<_>>();

        let localized_names = label_localized_name_history::Entity::find()
            .filter(
                label_localized_name_history::Column::HistoryId.eq(history_id),
            )
            .order_by_asc(label_localized_name_history::Column::LanguageId)
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

        let links = label_link_history::Entity::find()
            .filter(label_link_history::Column::HistoryId.eq(history_id))
            .all(db)
            .await?
            .into_iter()
            .map(|model| model.url)
            .collect::<Vec<_>>();

        Ok(json!({
            "name": history.name,
            "founded_date": DateWithPrecision::from_option(
                history.founded_date,
                history.founded_date_precision,
            ),
            "dissolved_date": DateWithPrecision::from_option(
                history.dissolved_date,
                history.dissolved_date_precision,
            ),
            "founders": founders,
            "localized_names": localized_names,
            "links": links,
        }))
    })
    .await
}
