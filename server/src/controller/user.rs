use crate::service::user::{AuthSession, Credential};
use crate::service::UserService;
use crate::{service, AppState};
use axum::extract::{Multipart, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Redirect};
use axum::routing::post;
use axum::{debug_handler, Form, Json, Router};
use axum_login::login_required;
use serde_json::json;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/avatar", post(upload_avatar))
        .route_layer(login_required!(UserService, login_url = "/signin"))
        .route("/signin", post(login))
}

#[debug_handler]
async fn upload_avatar(
    auth_session: AuthSession,
    State(image_service): State<service::image::Service>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, impl IntoResponse> {
    let user_id = auth_session.user.ok_or(StatusCode::UNAUTHORIZED)?.id;

    if let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?
    {
        let name = field.name().unwrap_or("").to_string();
        let content_type = field.content_type().unwrap_or("").to_string();

        if name != "data" {
            return Err(StatusCode::BAD_REQUEST);
        }

        if !content_type.starts_with("image/") {
            return Err(StatusCode::BAD_REQUEST);
        }

        let data = field.bytes().await.map_err(|_| StatusCode::BAD_REQUEST)?;

        image_service
            .create(data, user_id)
            .await
            .map(|_| {
                Json(json!({
                    "message": "Ok"
                }))
            })
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
    } else {
        Err(StatusCode::BAD_REQUEST)
    }
}

#[debug_handler]
async fn login(
    mut auth_session: AuthSession,
    Form(creds): Form<Credential>,
) -> impl IntoResponse {
    let user = match auth_session.authenticate(creds.clone()).await {
        Ok(Some(user)) => user,
        Ok(None) => return StatusCode::UNAUTHORIZED.into_response(),
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };

    if auth_session.login(&user).await.is_err() {
        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
    }

    Redirect::to("/").into_response()
}
