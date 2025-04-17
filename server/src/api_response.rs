#![allow(clippy::option_if_let_else)]

use std::fmt::Display;

use axum::Json;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use derive_more::Display;
use serde::Serialize;
use utoipa::openapi::{
    ContentBuilder, ObjectBuilder, RefOr, ResponseBuilder, ResponsesBuilder,
    Schema,
};
use utoipa::{PartialSchema, ToSchema, openapi};

use crate::error::{ApiErrorTrait, AsErrorCode, ErrorCode};
use crate::utils::openapi::ContentType;

#[derive(Debug, Serialize, Display)]
enum Status {
    Ok,
    Err,
}

pub trait StatusCodeExt {
    fn as_status_code(&self) -> StatusCode;

    fn all_status_codes() -> impl Iterator<Item = StatusCode>;
}

pub trait IntoApiResponse {
    fn into_api_response(self) -> axum::response::Response;
}

impl<T> IntoApiResponse for T
where
    T: ApiErrorTrait + std::error::Error,
{
    default fn into_api_response(self) -> axum::response::Response {
        default_into_api_response_impl(self)
    }
}

#[expect(clippy::needless_pass_by_value)]
pub fn default_into_api_response_impl<T>(x: T) -> axum::response::Response
where
    T: ApiErrorTrait + std::error::Error,
{
    Error::from_api_error(&x).into_response()
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

#[allow(clippy::struct_field_names)]
#[derive(ToSchema, Serialize)]
pub struct Error {
    #[schema(schema_with = status_err_schema)]
    status: Status,
    message: String,
    #[schema(
        value_type = usize
    )]
    error_code: ErrorCode,
    #[serde(skip)]
    status_code: StatusCode,
}

#[bon::bon]
impl Error {
    #[builder]
    pub fn new(
        message: &(impl Display + ?Sized),
        status_code: Option<StatusCode>,
        error_code: &impl AsErrorCode,
    ) -> Self {
        Self {
            status: Status::Err,
            message: message.to_string(),
            status_code: status_code
                .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            error_code: error_code.as_error_code(),
        }
    }

    pub fn from_api_error<T>(err: &T) -> Self
    where
        T: StatusCodeExt + AsErrorCode + Display,
    {
        Self {
            status: Status::Err,
            message: err.to_string(),
            error_code: err.as_error_code(),
            status_code: err.as_status_code(),
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
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        (self.status_code, Json(self)).into_response()
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
mod tests {
    use serde::Serialize;
    use serde_json::json;

    use super::*;

    #[test]
    fn test_response_json() {
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
    fn test_response_struct() {
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
    #[allow(clippy::as_conversions)]
    fn test_response_err() {
        let response = super::Error::builder()
            .error_code(&ErrorCode::UnknownError)
            .message("error")
            .build();

        let serialized = serde_json::to_string(&response)
            .expect("Failed to serialize response");

        let expected_json = format!(
            r#"{{"status":"{}","message":"error","error_code":{}}}"#,
            Status::Err,
            ErrorCode::UnknownError as usize
        );

        assert_eq!(serialized, expected_json);
    }
}
