use std::net::SocketAddr;
use std::sync::Arc;

use anyhow::Context;
use axum::Router;
use axum::body::Body;
use axum::extract::ConnectInfo;
use axum::http::{Request, StatusCode, header};
use base64::Engine;
use base64::prelude::BASE64_STANDARD;
use entity::{user, user_role};
use sea_orm::ActiveValue::Set;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use tower::ServiceExt;

use super::router;
use super::state::ArcAppState;
use crate::features::auth::UserRoleEnum;
use crate::infra::integration_test::fixture::MockUser;
use crate::infra::integration_test::test_state;

async fn request(
    app: &Router,
    path: &str,
    cookie: &str,
) -> anyhow::Result<axum::response::Response> {
    Ok(app
        .clone()
        .oneshot(
            Request::builder()
                .uri(path)
                .header(header::COOKIE, cookie)
                .extension(ConnectInfo(
                    "127.0.0.1:49321".parse::<SocketAddr>()?,
                ))
                .body(Body::empty())?,
        )
        .await?)
}

async fn sign_in(
    app: &Router,
    username: &str,
    password: &str,
) -> anyhow::Result<String> {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/sign-in")
                .header(header::CONTENT_TYPE, "application/json")
                .extension(ConnectInfo("127.0.0.1:49321".parse::<SocketAddr>()?))
                .body(Body::from(
                    serde_json::json!({"username": username, "password": password})
                        .to_string(),
                ))?,
        )
        .await?;
    assert_eq!(response.status(), StatusCode::OK);
    Ok(response
        .headers()
        .get(header::SET_COOKIE)
        .context("sign-in did not set a session cookie")?
        .to_str()?
        .split(';')
        .next()
        .context("session cookie is empty")?
        .to_owned())
}

const PASSWORD: &str = "Observability-test-password-123!";
const AUTH: &str = "/admin/observability/auth";

async fn setup() -> anyhow::Result<(
    Router,
    infra_db::DatabaseConnection,
    user::Model,
    tempfile::TempDir,
)> {
    let (state, images) = test_state().await?;
    let conn = state.database.clone();
    let app = router(ArcAppState::new(Arc::new(state)));
    let hash = crate::shared::secret::hash(PASSWORD)
        .await
        .map_err(|err| anyhow::anyhow!(err.to_string()))?;
    let mut admin_fixture = MockUser::with_label("observability_admin");
    admin_fixture.password = hash;
    let admin = admin_fixture.insert(&conn).await?;
    user_role::Entity::insert(user_role::ActiveModel {
        user_id: Set(admin.id),
        role_id: Set(UserRoleEnum::Admin.into()),
    })
    .exec(&conn)
    .await?;
    Ok((app, conn, admin, images))
}

#[tokio::test]
async fn observability_access_tracks_administrator_role() -> anyhow::Result<()>
{
    let (app, conn, admin, _images) = setup().await?;
    let mut user_fixture = MockUser::with_label("observability_user");
    user_fixture.password = admin.password.clone();
    let user = user_fixture.insert(&conn).await?;

    let admin_cookie = sign_in(&app, &admin.name, PASSWORD).await?;
    let user_cookie = sign_in(&app, &user.name, PASSWORD).await?;
    let response = request(&app, AUTH, &admin_cookie).await?;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);
    assert_eq!(
        response
            .headers()
            .get("x-webauth-user")
            .and_then(|v| v.to_str().ok()),
        Some("admin")
    );
    assert_eq!(
        request(&app, AUTH, &user_cookie).await?.status(),
        StatusCode::FORBIDDEN
    );

    user_role::Entity::delete_many()
        .filter(user_role::Column::UserId.eq(admin.id))
        .filter(user_role::Column::RoleId.eq(i32::from(UserRoleEnum::Admin)))
        .exec(&conn)
        .await?;
    assert_eq!(
        request(&app, AUTH, &admin_cookie).await?.status(),
        StatusCode::FORBIDDEN
    );
    Ok(())
}

#[tokio::test]
async fn proxy_auth_requires_a_session_when_basic_credentials_are_valid()
-> anyhow::Result<()> {
    let (app, _, admin, _images) = setup().await?;
    let basic = BASE64_STANDARD.encode(format!("{}:{PASSWORD}", admin.name));
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/admin/users")
                .header(header::AUTHORIZATION, format!("Basic {basic}"))
                .extension(ConnectInfo(
                    "127.0.0.1:49321".parse::<SocketAddr>()?,
                ))
                .body(Body::empty())?,
        )
        .await?;
    assert_eq!(response.status(), StatusCode::OK);
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(AUTH)
                .header(header::AUTHORIZATION, format!("Basic {basic}"))
                .body(Body::empty())?,
        )
        .await?;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    Ok(())
}

#[tokio::test]
async fn observability_access_requires_a_verified_email() -> anyhow::Result<()>
{
    let (app, conn, admin, _images) = setup().await?;
    let admin_cookie = sign_in(&app, &admin.name, PASSWORD).await?;
    user::Entity::update_many()
        .col_expr(
            user::Column::EmailVerified,
            sea_orm::sea_query::Expr::value(false),
        )
        .filter(user::Column::Id.eq(admin.id))
        .exec(&conn)
        .await?;
    assert_eq!(
        request(&app, AUTH, &admin_cookie).await?.status(),
        StatusCode::UNAUTHORIZED
    );
    Ok(())
}
