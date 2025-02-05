#![allow(clippy::option_if_let_else)]

use std::fmt::Display;

use axum::Json;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use once_cell::sync::Lazy;
use serde::Serialize;
use utoipa::openapi::{
    ContentBuilder, ObjectBuilder, RefOr, ResponseBuilder, ResponsesBuilder,
    Schema,
};
use utoipa::{PartialSchema, ToSchema, openapi};

use crate::error::{AsErrorCode, ErrorCode};
use crate::utils::openapi::ContentType;

pub trait StatusCodeExt {
    fn as_status_code(&self) -> StatusCode;

    fn all_status_codes() -> impl Iterator<Item = StatusCode>;
}

// impl<T> AsStatusCode for Option<T>
// where
//     T: AsStatusCode,
// {
//     fn as_status_code(&self) -> StatusCode {
//         self.as_ref().map_or(
//             StatusCode::INTERNAL_SERVER_ERROR,
//             AsStatusCode::as_status_code,
//         )
//     }
// }

#[derive(Debug)]
enum ApiStatus {
    Ok,
    Err,
}

impl Display for ApiStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::Ok => "Ok",
            Self::Err => "Err",
        })
    }
}

fn status_ok_schema() -> impl Into<RefOr<Schema>> {
    ObjectBuilder::new()
        .schema_type(openapi::Type::String)
        .enum_values(vec![ApiStatus::Ok.to_string()].into())
        .build()
}

fn status_err_schema() -> impl Into<RefOr<Schema>> {
    ObjectBuilder::new()
        .schema_type(openapi::Type::String)
        .enum_values(vec![ApiStatus::Err.to_string()].into())
        .build()
}

#[derive(ToSchema, Serialize)]
pub struct Data<T> {
    #[schema(
        schema_with = status_ok_schema
    )]
    status: String,
    data: T,
}

impl<T> Data<T>
where
    T: Serialize,
{
    pub fn new(data: T) -> Self {
        Self {
            status: ApiStatus::Ok.to_string(),
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

impl<T> Default for Data<T>
where
    T: Default + Serialize,
{
    fn default() -> Self {
        Self {
            status: ApiStatus::Ok.to_string(),
            data: Default::default(),
        }
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
    status: String,
    message: String,
}

impl Message {
    pub fn ok() -> Self {
        Self {
            status: ApiStatus::Ok.to_string(),
            message: ApiStatus::Ok.to_string(),
        }
    }
}

impl Default for Message {
    fn default() -> Self {
        Self {
            status: ApiStatus::Ok.to_string(),
            message: String::new(),
        }
    }
}

impl IntoResponse for Message {
    fn into_response(self) -> axum::response::Response {
        Json(self).into_response()
    }
}

#[allow(clippy::struct_field_names)]
#[derive(ToSchema, Serialize)]
pub struct Error {
    #[schema(schema_with = status_err_schema)]
    status: String,
    message: String,
    #[schema(
        value_type = usize
    )]
    error_code: ErrorCode,
    #[serde(skip)]
    status_code: StatusCode,
}

impl Default for Error {
    fn default() -> Self {
        Self {
            status: ApiStatus::Err.to_string(),
            message: String::new(),
            status_code: StatusCode::INTERNAL_SERVER_ERROR,
            error_code: ErrorCode::UnknownError,
        }
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        (self.status_code, Json(self)).into_response()
    }
}

static ERR_RESPONSE_CACHE: Lazy<utoipa::openapi::Response> = Lazy::new(|| {
    ResponseBuilder::new()
        .content(
            ContentType::Json,
            ContentBuilder::new().schema(Error::schema().into()).build(),
        )
        .build()
});

impl Error {
    pub fn response_def() -> utoipa::openapi::Response {
        ERR_RESPONSE_CACHE.clone()
    }
}

pub trait ErrResponseDef {
    fn build_err_responses() -> utoipa::openapi::Responses;
}

impl<T> ErrResponseDef for T
where
    T: StatusCodeExt,
{
    fn build_err_responses() -> utoipa::openapi::Responses {
        ResponsesBuilder::new()
            .responses_from_iter(T::all_status_codes().map(|x| {
                if x == StatusCode::UNAUTHORIZED {
                    // Won't return body if unauthorized
                    (x.as_u16().to_string(), ResponseBuilder::new().build())
                } else {
                    (x.as_u16().to_string(), Error::response_def())
                }
            }))
            .build()
    }
}

pub fn data<T: Serialize + Default>(data: T) -> Data<T> {
    Data {
        data,
        ..Data::default()
    }
}

pub fn msg<M>(message: M) -> Message
where
    M: Into<String>,
{
    Message {
        message: message.into(),
        ..Message::default()
    }
}

#[deprecated = "Use `Message::ok` instead"]
pub fn ok() -> Message {
    msg("Ok")
}

pub fn err<C, M>(code: C, message: M, error_code: ErrorCode) -> Error
where
    C: Into<Option<StatusCode>>,
    M: Display,
{
    Error {
        message: message.to_string(),
        status_code: code.into().unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
        error_code,
        ..Error::default()
    }
}

pub trait IntoApiResponse {
    fn into_api_response(self) -> axum::response::Response;
}

impl<T> IntoApiResponse for T
where
    T: StatusCodeExt
        + Display
        + AsErrorCode
        + std::fmt::Debug
        + std::error::Error,
{
    fn into_api_response(self) -> axum::response::Response {
        match self.as_error_code() {
            ErrorCode::DatabaseError => {
                tracing::error!(
                    "Database error: {:#?} {:#?}",
                    &self,
                    &self.source()
                );
            }
            ErrorCode::TokioError => {
                tracing::error!(
                    "Tokio error: {:#?} {:#?}",
                    &self,
                    &self.source()
                );
            }
            _ => (),
        }

        default_impl_into_api_response(self)
    }
}

pub fn default_impl_into_api_response<T>(err: T) -> axum::response::Response
where
    T: StatusCodeExt + Display + AsErrorCode,
{
    Error {
        message: err.to_string(),
        error_code: err.as_error_code(),
        status_code: err.as_status_code(),
        ..Default::default()
    }
    .into_response()
}

#[cfg(test)]
mod tests {
    use serde::Serialize;
    use serde_json::json;

    use super::*;

    #[test]
    fn test_response_json() {
        let response = super::data(json!({"a": 1}));
        let serialized = serde_json::to_string(&response).unwrap();

        assert_eq!(
            serialized,
            format!(r#"{{"status":"{}","data":{{"a":1}}}}"#, ApiStatus::Ok)
        );
    }

    #[derive(Serialize, Default, ToSchema)]
    struct Person {
        id: i32,
        name: String,
        age: i8,
    }

    #[test]
    fn test_response_struct() {
        let response = super::data(Person {
            id: 1,
            name: "John".to_string(),
            age: 30,
        });
        let serialized = serde_json::to_string(&response).unwrap();

        assert_eq!(
            serialized,
            format!(
                r#"{{"status":"{}","data":{{"id":1,"name":"John","age":30}}}}"#,
                ApiStatus::Ok
            )
        );
    }

    #[test]
    #[allow(clippy::as_conversions)]
    fn test_response_err() {
        let response = super::err(None, "error", ErrorCode::UnknownError);
        let serialized = serde_json::to_string(&response)
            .expect("Failed to serialize response");

        let expected_json = format!(
            r#"{{"status":"{}","message":"error","error_code":{}}}"#,
            ApiStatus::Err,
            ErrorCode::UnknownError as usize
        );

        assert_eq!(serialized, expected_json);
    }
}
