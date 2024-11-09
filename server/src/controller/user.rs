use crate::middleware::is_signed_in;
use crate::model::user::{SignIn, SignUp, UploadAvatar};
use crate::service::user::AuthSession;
use crate::{api_response, service, AppState};
use axum::extract::State;
use axum::http::StatusCode;
use axum::middleware::from_fn;
use axum::response::{IntoResponse, Redirect};
use axum::Json;
use axum_typed_multipart::TypedMultipart;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(upload_avatar))
        .route_layer(from_fn(is_signed_in))
        .routes(routes!(sign_in))
        .routes(routes!(sign_up))
}

#[utoipa::path(
    post,
    path = "/",
    request_body = SignIn,
    responses((status = 200, body = api_response::Message)),
)]
async fn sign_up(
    mut auth_session: AuthSession,
    State(user_service): State<service::User>,
    Json(SignUp { username, password }): Json<SignUp>,
) -> impl IntoResponse {
    match user_service.create(&username, &password).await {
        Ok(user) => match auth_session.login(&user).await {
            Ok(_) => Redirect::to("/").into_response(),
            Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
                .into_response(),
        },
        Err(e) => e.into_response(),
    }
}
#[utoipa::path(
    post,
    path = "/",
    request_body = SignIn,
    responses((status = 200, body = api_response::Message))
)]
async fn sign_in(
    mut auth_session: AuthSession,
    Json(creds): Json<SignIn>,
) -> impl IntoResponse {
    if auth_session.user.is_some() {
        return api_response::err(
            "Already signed in",
            Some(StatusCode::from_u16(409).unwrap()),
        )
        .into_response();
    }

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

#[utoipa::path(
    post,
    path = "/",
    request_body(
        content_type = "multipart/form-data",
        content = UploadAvatar,
    ),
    responses((status = 200, body = api_response::Message))
)]
async fn upload_avatar(
    auth_session: AuthSession,
    State(image_service): State<service::image::Service>,
    TypedMultipart(form): TypedMultipart<UploadAvatar>,
) -> Result<impl IntoResponse, impl IntoResponse> {
    let data = form.data;
    let metadata = data.metadata;
    let user_id = auth_session.user.ok_or(StatusCode::UNAUTHORIZED)?.id;

    if metadata
        .content_type
        .map_or(false, |ct| ct.starts_with("image/"))
    {
        Ok(api_response::msg("ok"))
        // TODO
        // image_service
        //     .create(data.contents, user_id)
        //     .await
        //     .map(|_| api_response::msg("ok"))
        //     .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
    } else {
        Err(StatusCode::BAD_REQUEST)
    }
}
