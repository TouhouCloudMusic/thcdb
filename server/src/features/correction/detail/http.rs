use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use entity::enums::EntityType;
use entity::{
    artist, correction as correction_entity, credit_role, event, label,
    release, song, song_lyrics, tag,
};
use sea_orm::{DatabaseConnection, EntityTrait};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::model::CorrectionDetail;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::features::correction::comment;
use crate::infra::error::Error;
use crate::shared::http::api_response::{self, AppError, Data};

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(get_correction)))
        .finish()
}

data!(DataCorrectionDetail, CorrectionDetail);

#[utoipa::path(
    get,
    tag = "Correction",
    path = "/correction/{id}",
    responses(
        (status = 200, body = DataCorrectionDetail),
    ),
)]
async fn get_correction(
    Path(id): Path<i32>,
    State(repo): State<state::SeaOrmRepository>,
) -> Result<Data<CorrectionDetail>, axum::response::Response> {
    let Some(model) = correction_entity::Entity::find_by_id(id)
        .one(&repo.conn)
        .await
        .map_err(Error::from)
        .map_err(IntoResponse::into_response)?
    else {
        return Err(api_response::Error::new((
            "Correction not found",
            StatusCode::NOT_FOUND,
        ))
        .into_response());
    };

    let comments = comment::initial_page(&repo.conn, id)
        .await
        .map_err(AppError::from)?;
    let entity_name =
        find_entity_name(&repo.conn, model.entity_type, model.entity_id)
            .await
            .map_err(Error::from)
            .map_err(IntoResponse::into_response)?;
    let Some(entity_name) = entity_name else {
        return Err(api_response::Error::new((
            "Correction entity not found",
            StatusCode::NOT_FOUND,
        ))
        .into_response());
    };

    Ok(Data::from(CorrectionDetail {
        id: model.id,
        status: model.status,
        r#type: model.r#type,
        entity_id: model.entity_id,
        entity_type: model.entity_type,
        entity_name,
        created_at: model.created_at,
        handled_at: model.handled_at,
        comments,
    }))
}

async fn find_entity_name(
    conn: &DatabaseConnection,
    entity_type: EntityType,
    entity_id: i32,
) -> Result<Option<String>, sea_orm::DbErr> {
    let name = match entity_type {
        EntityType::Artist => artist::Entity::find_by_id(entity_id)
            .one(conn)
            .await?
            .map(|model| model.name),
        EntityType::Label => label::Entity::find_by_id(entity_id)
            .one(conn)
            .await?
            .map(|model| model.name),
        EntityType::Release => release::Entity::find_by_id(entity_id)
            .one(conn)
            .await?
            .map(|model| model.title),
        EntityType::Song => song::Entity::find_by_id(entity_id)
            .one(conn)
            .await?
            .map(|model| model.title),
        EntityType::Tag => tag::Entity::find_by_id(entity_id)
            .one(conn)
            .await?
            .map(|model| model.name),
        EntityType::Event => event::Entity::find_by_id(entity_id)
            .one(conn)
            .await?
            .map(|model| model.name),
        EntityType::SongLyrics => {
            match song_lyrics::Entity::find_by_id(entity_id).one(conn).await? {
                Some(lyrics) => song::Entity::find_by_id(lyrics.song_id)
                    .one(conn)
                    .await?
                    .map(|model| model.title),
                None => None,
            }
        }
        EntityType::CreditRole => credit_role::Entity::find_by_id(entity_id)
            .one(conn)
            .await?
            .map(|model| model.name),
    };

    Ok(name)
}
