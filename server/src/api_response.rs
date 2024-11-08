use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde::Serialize;
use utoipa::openapi::{ObjectBuilder, RefOr, Schema};
use utoipa::{openapi, ToSchema};

const STATUS_OK: &str = "Ok";
const STATUS_ERR: &str = "Err";

fn status_ok_schema() -> impl Into<RefOr<Schema>> {
    ObjectBuilder::new()
        .schema_type(openapi::Type::String)
        .enum_values(vec![STATUS_OK].into())
        .build()
}

#[derive(ToSchema, Serialize)]
pub struct Data<T>
where
    T: Default + Serialize,
{
    #[schema(
        schema_with = status_ok_schema
    )]
    status: String,
    data: T,
}

impl<T> Default for Data<T>
where
    T: Default + Serialize,
{
    fn default() -> Self {
        Self {
            status: STATUS_OK.to_string(),
            data: Default::default(),
        }
    }
}

impl<T> IntoResponse for Data<T>
where
    T: Default + Serialize,
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

impl Default for Message {
    fn default() -> Self {
        Self {
            status: STATUS_OK.to_string(),
            message: String::new(),
        }
    }
}

impl IntoResponse for Message {
    fn into_response(self) -> axum::response::Response {
        Json(self).into_response()
    }
}

#[derive(ToSchema, Serialize)]
pub struct Err {
    status: String,
    message: String,
    #[serde(skip)]
    code: StatusCode,
}

impl Default for Err {
    fn default() -> Self {
        Self {
            status: STATUS_ERR.to_string(),
            message: String::new(),
            code: StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}
impl IntoResponse for Err {
    fn into_response(self) -> axum::response::Response {
        (self.code, Json(self)).into_response()
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
    M: ToString,
{
    Message {
        message: message.to_string(),
        ..Message::default()
    }
}

pub fn err(message: String, code: Option<StatusCode>) -> Err {
    Err {
        message,
        code: code.unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
        ..Err::default()
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use serde::Serialize;
    use serde_json::json;
    
    #[test]
    fn test_response_json() {
        let response = super::data(json!({"a": 1}));
        let serialized = serde_json::to_string(&response).unwrap();

        assert_eq!(
            serialized,
            format!(r#"{{"status":"{STATUS_OK}","data":{{"a":1}}}}"#)
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
                r#"{{"status":"{STATUS_OK}","data":{{"id":1,"name":"John","age":30}}}}"#
            )
        );
    }

    #[test]
    fn test_response_err() {
        let response = super::err("error".to_string(), None);
        let serialized = serde_json::to_string(&response).unwrap();
        assert_eq!(
            serialized,
            format!(r#"{{"status":"{STATUS_ERR}","message":"error"}}"#)
        );
    }
}
