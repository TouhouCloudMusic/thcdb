use crate::service::user::{AuthSession, Credential};
use crate::{api_response, service, AppState};
use axum::body::Bytes;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Redirect};
use axum::Form;
use axum_typed_multipart::{FieldData, TryFromMultipart, TypedMultipart};
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new().routes(routes!(upload_avatar))

    // Router::new()
    //     .route("/avatar", post(upload_avatar))
    //     .route_layer(login_required!(UserService, login_url = "/signin"))
    //     .route("/signin", post(login))
}

#[derive(ToSchema, TryFromMultipart)]
struct AvatarUpload {
    #[form_data(limit = "2MiB")]
    #[schema(value_type = String, format = Binary)]
    data: FieldData<Bytes>,
}

#[utoipa::path(
    post,
    path = "/avatar",
    request_body(
        content_type = "multipart/form-data",
        content = AvatarUpload,
    ),
    responses((status = 200, body = api_response::Message))
)]
async fn upload_avatar(
    auth_session: AuthSession,
    State(image_service): State<service::image::Service>,
    TypedMultipart(AvatarUpload { data }): TypedMultipart<AvatarUpload>,
) -> Result<impl IntoResponse, impl IntoResponse> {
    let user_id = auth_session.user.ok_or(StatusCode::UNAUTHORIZED)?.id;
    let metadata = data.metadata;

    if metadata
        .content_type
        .map_or(false, |ct| ct.starts_with("image/"))
    {
        image_service
            .create(data.contents, user_id)
            .await
            .map(|_| api_response::msg("ok"))
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
    } else {
        Err(StatusCode::BAD_REQUEST)
    }
}

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
