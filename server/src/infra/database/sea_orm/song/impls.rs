use entity::{
    correction_revision, song, song_credit, song_credit_history, song_history,
    song_language, song_language_history, song_localized_title,
    song_localized_title_history,
};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseTransaction, DbErr, EntityTrait,
    ModelTrait, QueryFilter, QueryOrder,
};

pub async fn apply_update(
    correction: entity::correction::Model,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let revision = correction
        .find_related(correction_revision::Entity)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(tx)
        .await?
        .ok_or_else(|| {
            DbErr::Custom("Correction revision not found".to_string())
        })?;

    let history = song_history::Entity::find_by_id(revision.entity_history_id)
        .one(tx)
        .await?
        .ok_or_else(|| DbErr::Custom("Song history not found".to_string()))?;

    // Convert history to ActiveModel
    let active_model = song::ActiveModel {
        id: Set(correction.entity_id),
        title: Set(history.title),
    };

    active_model.update(tx).await?;

    let song_id = correction.entity_id;
    let history_id = revision.entity_history_id;

    // Update related entities
    update_credits(song_id, history_id, tx).await?;
    update_languages(song_id, history_id, tx).await?;
    update_localized_titles(song_id, history_id, tx).await?;

    Ok(())
}

async fn update_credits(
    song_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    // First delete existing credits
    song_credit::Entity::delete_many()
        .filter(song_credit::Column::SongId.eq(song_id))
        .exec(tx)
        .await?;

    // Get history credit records
    let credits = song_credit_history::Entity::find()
        .filter(song_credit_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?;

    if credits.is_empty() {
        return Ok(());
    }

    // Create new models from history
    let models = credits.iter().map(|credit| song_credit::ActiveModel {
        song_id: Set(song_id),
        artist_id: Set(credit.artist_id),
        role_id: Set(credit.role_id),
    });

    // Insert new models
    song_credit::Entity::insert_many(models).exec(tx).await?;

    Ok(())
}

async fn update_languages(
    song_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    // First delete existing languages
    song_language::Entity::delete_many()
        .filter(song_language::Column::SongId.eq(song_id))
        .exec(tx)
        .await?;

    // Get history language records
    let languages = song_language_history::Entity::find()
        .filter(song_language_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?;

    if languages.is_empty() {
        return Ok(());
    }

    // Create new models from history
    let models = languages.iter().map(|language| song_language::ActiveModel {
        song_id: Set(song_id),
        language_id: Set(language.language_id),
    });

    // Insert new models
    song_language::Entity::insert_many(models).exec(tx).await?;

    Ok(())
}

async fn update_localized_titles(
    song_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    // First delete existing localized titles
    song_localized_title::Entity::delete_many()
        .filter(song_localized_title::Column::SongId.eq(song_id))
        .exec(tx)
        .await?;

    // Get history localized title records
    let titles = song_localized_title_history::Entity::find()
        .filter(song_localized_title_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?;

    if titles.is_empty() {
        return Ok(());
    }

    // Create new models from history
    let models = titles
        .iter()
        .map(|title| song_localized_title::ActiveModel {
            id: NotSet,
            song_id: Set(song_id),
            language_id: Set(title.language_id),
            title: Set(title.title.clone()),
        });

    // Insert new models
    song_localized_title::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
}
