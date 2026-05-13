#![allow(clippy::option_if_let_else)]

use std::fmt::Display;
use std::panic::Location;

use axum::Json;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use derive_more::Display;
use serde::Serialize;
use utoipa::openapi::{
    ContentBuilder, ObjectBuilder, RefOr, ResponseBuilder, Schema,
};
use utoipa::{PartialSchema, ToSchema, openapi};

use crate::infra::database::error::DatabaseError;
use crate::shared::error::{EntityNotFound, InternalError, PermissionDenied};
use crate::shared::types::BoxedError;
use crate::utils::openapi::ContentType;

#[derive(Debug, Serialize, Display)]
enum Status {
    Ok,
    Err,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AppErrorKind {
    BadRequest,
    Unauthorized,
    Forbidden,
    NotFound,
    Conflict,
    TooManyRequests,
    ServiceUnavailable,
    Internal,
}

impl AppErrorKind {
    pub const fn status_code(self) -> StatusCode {
        match self {
            Self::BadRequest => StatusCode::BAD_REQUEST,
            Self::Unauthorized => StatusCode::UNAUTHORIZED,
            Self::Forbidden => StatusCode::FORBIDDEN,
            Self::NotFound => StatusCode::NOT_FOUND,
            Self::Conflict => StatusCode::CONFLICT,
            Self::TooManyRequests => StatusCode::TOO_MANY_REQUESTS,
            Self::ServiceUnavailable => StatusCode::SERVICE_UNAVAILABLE,
            Self::Internal => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

#[derive(Debug)]
pub struct AppError {
    kind: AppErrorKind,
    message: String,
    source: Option<BoxedError>,
    location: &'static Location<'static>,
}

impl AppError {
    #[track_caller]
    pub fn new(kind: AppErrorKind, message: impl Into<String>) -> Self {
        Self {
            kind,
            message: message.into(),
            source: None,
            location: Location::caller(),
        }
    }

    #[track_caller]
    pub fn bad_request(message: impl Into<String>) -> Self {
        Self::new(AppErrorKind::BadRequest, message)
    }

    #[track_caller]
    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self::new(AppErrorKind::Unauthorized, message)
    }

    #[track_caller]
    pub fn forbidden(message: impl Into<String>) -> Self {
        Self::new(AppErrorKind::Forbidden, message)
    }

    #[track_caller]
    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new(AppErrorKind::NotFound, message)
    }

    #[track_caller]
    pub fn conflict(message: impl Into<String>) -> Self {
        Self::new(AppErrorKind::Conflict, message)
    }

    #[track_caller]
    pub fn internal(
        source: impl std::error::Error + Send + Sync + 'static,
    ) -> Self {
        Self {
            kind: AppErrorKind::Internal,
            message: "Internal server error".to_string(),
            source: Some(Box::new(source)),
            location: Location::caller(),
        }
    }

    pub const fn status_code(&self) -> StatusCode {
        self.kind.status_code()
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for AppError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        self.source
            .as_deref()
            .map(|err| err as &(dyn std::error::Error + 'static))
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        if self.kind == AppErrorKind::Internal {
            match &self.source {
                Some(source) => {
                    log::error!(
                        target: "shared.http.app_error",
                        location:% = self.location,
                        error:? = source;
                        "internal error"
                    );
                }
                None => {
                    log::error!(
                        target: "shared.http.app_error",
                        location:% = self.location;
                        "internal error"
                    );
                }
            }
        }

        let status_code = self.status_code();
        Error::from_err_and_code(&self.message, status_code).into_response()
    }
}

impl From<AppError> for axum::response::Response {
    fn from(err: AppError) -> Self {
        err.into_response()
    }
}

impl From<PermissionDenied> for AppError {
    #[track_caller]
    fn from(err: PermissionDenied) -> Self {
        Self::forbidden(err.to_string())
    }
}

impl From<EntityNotFound> for AppError {
    #[track_caller]
    fn from(err: EntityNotFound) -> Self {
        Self::not_found(err.to_string())
    }
}

impl From<InternalError> for AppError {
    #[track_caller]
    fn from(err: InternalError) -> Self {
        Self {
            kind: AppErrorKind::Internal,
            message: "Internal server error".to_string(),
            source: Some(err.0),
            location: Location::caller(),
        }
    }
}

impl From<DatabaseError> for AppError {
    #[track_caller]
    fn from(err: DatabaseError) -> Self {
        Self::internal(err)
    }
}

#[derive(ToSchema, Serialize)]
pub struct Data<T> {
    #[schema(
        schema_with = status_ok_schema
    )]
    status: Status,
    data: T,
}

impl<T> Data<T>
where
    T: Serialize,
{
    pub const fn new(data: T) -> Self {
        Self {
            status: Status::Ok,
            data,
        }
    }
}

impl<T> From<T> for Data<T>
where
    T: Serialize,
{
    fn from(data: T) -> Self {
        Self::new(data)
    }
}

impl<T> IntoResponse for Data<T>
where
    T: Serialize,
{
    fn into_response(self) -> axum::response::Response {
        Json(self).into_response()
    }
}

#[derive(ToSchema, Serialize)]
pub struct Message {
    #[schema(
        schema_with = status_ok_schema
    )]
    status: Status,
    message: String,
}

impl Message {
    pub fn ok() -> Self {
        Self {
            status: Status::Ok,
            message: Status::Ok.to_string(),
        }
    }

    pub fn new(message: impl Display) -> Self {
        Self {
            status: Status::Ok,
            message: message.to_string(),
        }
    }
}

impl IntoResponse for Message {
    fn into_response(self) -> axum::response::Response {
        Json(self).into_response()
    }
}

#[derive(ToSchema, Serialize)]
pub struct Error {
    #[schema(
        schema_with = status_err_schema
    )]
    status: Status,
    message: String,
    #[serde(skip)]
    status_code: StatusCode,
}

trait IntoError {
    fn into_error(self) -> Error;
}

impl IntoError for &str {
    fn into_error(self) -> Error {
        Error {
            status: Status::Err,
            message: self.to_string(),
            status_code: StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl IntoError for String {
    fn into_error(self) -> Error {
        Error {
            status: Status::Err,
            message: self,
            status_code: StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl<T> IntoError for (T, StatusCode)
where
    T: Display,
{
    fn into_error(self) -> Error {
        Error {
            status: Status::Err,
            message: self.0.to_string(),
            status_code: self.1,
        }
    }
}

impl Error {
    // TODO: Remove this trait
    #[expect(private_bounds)]
    pub fn new(err: impl IntoError) -> Self {
        err.into_error()
    }

    pub fn from_err_and_code(
        err: &(impl ToString + ?Sized),
        status_code: impl Into<StatusCode>,
    ) -> Self {
        Self {
            status: Status::Err,
            message: err.to_string(),
            status_code: status_code.into(),
        }
    }

    pub fn response_def() -> utoipa::openapi::Response {
        ResponseBuilder::new()
            .content(
                ContentType::Json,
                ContentBuilder::new().schema(Self::schema().into()).build(),
            )
            .build()
    }

    pub fn responses(
        status_codes: impl IntoIterator<Item = StatusCode>,
    ) -> utoipa::openapi::Responses {
        utoipa::openapi::ResponsesBuilder::new()
            .responses_from_iter(status_codes.into_iter().map(|status_code| {
                (status_code.as_u16().to_string(), Self::response_def())
            }))
            .build()
    }
}

impl utoipa::IntoResponses for Error {
    fn responses() -> std::collections::BTreeMap<
        std::string::String,
        utoipa::openapi::RefOr<utoipa::openapi::response::Response>,
    > {
        Self::responses([StatusCode::INTERNAL_SERVER_ERROR]).into()
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        (self.status_code, Json(self)).into_response()
    }
}

pub fn status_ok_schema() -> impl Into<RefOr<Schema>> {
    ObjectBuilder::new()
        .schema_type(openapi::Type::String)
        .enum_values(vec![Status::Ok.to_string()].into())
        .build()
}

pub fn status_err_schema() -> impl Into<RefOr<Schema>> {
    ObjectBuilder::new()
        .schema_type(openapi::Type::String)
        .enum_values(vec![Status::Err.to_string()].into())
        .build()
}

#[cfg(test)]
mod test {
    use axum::body::to_bytes;
    use serde::Serialize;
    use serde_json::json;

    use super::*;

    #[test]
    fn serialize_data_json() {
        let response = super::Data::new(json!({"a": 1}));
        let serialized = serde_json::to_string(&response).unwrap();

        assert_eq!(
            serialized,
            format!(r#"{{"status":"{}","data":{{"a":1}}}}"#, Status::Ok)
        );
    }

    #[derive(Serialize, Default, ToSchema)]
    struct Person {
        id: i32,
        name: String,
        age: i8,
    }

    #[test]
    fn serialize_data_struct() {
        let response = super::Data::new(Person {
            id: 1,
            name: "John".to_string(),
            age: 30,
        });
        let serialized = serde_json::to_string(&response).unwrap();

        assert_eq!(
            serialized,
            format!(
                r#"{{"status":"{}","data":{{"id":1,"name":"John","age":30}}}}"#,
                Status::Ok
            )
        );
    }

    #[test]
    fn serialize_error() {
        let response = super::Error::new("error");

        let serialized = serde_json::to_string(&response)
            .expect("Failed to serialize response");

        let expected_json =
            format!(r#"{{"status":"{}","message":"error"}}"#, Status::Err,);

        assert_eq!(serialized, expected_json);
    }

    #[derive(Debug)]
    struct SecretError(&'static str);

    impl std::fmt::Display for SecretError {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "{}", self.0)
        }
    }

    impl std::error::Error for SecretError {}

    async fn response_body_string(
        response: axum::response::Response,
    ) -> String {
        let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        String::from_utf8(bytes.to_vec()).unwrap()
    }

    #[tokio::test]
    async fn app_error_internal_response_is_opaque() {
        let response =
            AppError::internal(SecretError("database secret")).into_response();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        let body = response_body_string(response).await;
        assert!(body.contains(r#""message":"Internal server error""#));
        assert!(!body.contains("database secret"));
    }
}
