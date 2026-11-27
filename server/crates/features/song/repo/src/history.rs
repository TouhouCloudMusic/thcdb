use entity::{
    song_artist_history, song_credit_history, song_history,
    song_language_history, song_link_history, song_localized_title_history,
    song_relation_history,
};
use infra_db::error::{
    BrokenEntityReference, DatabaseFailure, DatabaseResultExt,
};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, QueryFilter, QueryOrder,
    Select,
};
use serde_json::{Value, json};

fn select_artists(history_id: i32) -> Select<song_artist_history::Entity> {
    song_artist_history::Entity::find()
        .filter(song_artist_history::Column::HistoryId.eq(history_id))
        .order_by_asc(song_artist_history::Column::ArtistId)
}

fn select_credits(history_id: i32) -> Select<song_credit_history::Entity> {
    song_credit_history::Entity::find()
        .filter(song_credit_history::Column::HistoryId.eq(history_id))
        .order_by_asc(song_credit_history::Column::Id)
}

fn select_localized_titles(
    history_id: i32,
) -> Select<song_localized_title_history::Entity> {
    song_localized_title_history::Entity::find()
        .filter(song_localized_title_history::Column::HistoryId.eq(history_id))
        .order_by_asc(song_localized_title_history::Column::Id)
}

fn select_languages(history_id: i32) -> Select<song_language_history::Entity> {
    song_language_history::Entity::find()
        .filter(song_language_history::Column::HistoryId.eq(history_id))
        .order_by_asc(song_language_history::Column::LanguageId)
}

fn select_relations(history_id: i32) -> Select<song_relation_history::Entity> {
    song_relation_history::Entity::find()
        .filter(song_relation_history::Column::HistoryId.eq(history_id))
        .order_by_asc(song_relation_history::Column::SourceId)
        .order_by_asc(song_relation_history::Column::DerivedId)
        .order_by_asc(song_relation_history::Column::RelationType)
}

fn select_links(history_id: i32) -> Select<song_link_history::Entity> {
    song_link_history::Entity::find()
        .filter(song_link_history::Column::HistoryId.eq(history_id))
}

#[fastrace::trace(name = "correction.snapshot_song")]
pub async fn load_history_snapshot(
    db: &impl ConnectionTrait,
    history_id: i32,
) -> Result<Value, DbErr> {
    let history = song_history::Entity::find_by_id(history_id)
        .one(db)
        .await?
        .ok_or_else(|| DbErr::Custom("Song history not found".to_string()))?;

    let artists = select_artists(history_id)
        .all(db)
        .await?
        .into_iter()
        .map(|model| model.artist_id)
        .collect::<Vec<_>>();

    let credits = select_credits(history_id)
        .all(db)
        .await?
        .into_iter()
        .map(|model| {
            json!({
                "artist_id": model.artist_id,
                "role_id": model.role_id,
            })
        })
        .collect::<Vec<_>>();

    let localized_titles = select_localized_titles(history_id)
        .all(db)
        .await?
        .into_iter()
        .map(|model| {
            json!({
                "language_id": model.language_id,
                "title": model.title,
            })
        })
        .collect::<Vec<_>>();

    let language_ids = select_languages(history_id)
        .all(db)
        .await?
        .into_iter()
        .map(|model| model.language_id)
        .collect::<Vec<_>>();

    let relations = select_relations(history_id)
        .all(db)
        .await?
        .into_iter()
        .map(|model| {
            json!({
                "source_id": model.source_id,
                "derived_id": model.derived_id,
                "relation_type": model.relation_type,
                "description": model.description,
            })
        })
        .collect::<Vec<_>>();

    let links = select_links(history_id)
        .all(db)
        .await?
        .into_iter()
        .map(|model| model.url)
        .collect::<Vec<_>>();

    Ok(json!({
        "title": history.title,
        "artists": artists,
        "credits": credits,
        "localized_titles": localized_titles,
        "languages": language_ids,
        "links": links,
        "relations": relations,
    }))
}

pub struct PendingSongHistory {
    pub title: String,
    pub artists: Vec<song_artist_history::Model>,
    pub credits: Vec<song_credit_history::Model>,
    pub languages: Vec<song_language_history::Model>,
    pub localized_titles: Vec<song_localized_title_history::Model>,
    pub relations: Vec<song_relation_history::Model>,
    pub links: Vec<song_link_history::Model>,
}

pub async fn load_pending_history(
    history_id: i32,
    db: &impl ConnectionTrait,
) -> Result<PendingSongHistory, DatabaseFailure> {
    let history = song_history::Entity::find_by_id(history_id)
        .one(db)
        .await
        .db_context("find pending song history")?
        .ok_or(BrokenEntityReference {
            entity: "song history",
            id: history_id,
        })?;

    // Convert synchronously to avoid retaining Select::all wrappers in each branch.
    let (artists, credits, languages, localized_titles, relations, links) =
        tokio::try_join!(
            select_artists(history.id).into_model().all(db),
            select_credits(history.id).into_model().all(db),
            select_languages(history.id).into_model().all(db),
            select_localized_titles(history.id).into_model().all(db),
            select_relations(history.id).into_model().all(db),
            select_links(history.id)
                .order_by_asc(song_link_history::Column::Id)
                .into_model()
                .all(db),
        )
        .db_context("load pending song history associations")?;

    Ok(PendingSongHistory {
        title: history.title,
        artists,
        credits,
        languages,
        localized_titles,
        relations,
        links,
    })
}
