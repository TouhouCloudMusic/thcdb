use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

#[derive(Serialize, Deserialize, ToSchema)]
pub struct Cursored<T> {
    pub items: Vec<T>,
    pub next_cursor: Option<i32>,
}

impl<T> Cursored<T> {
    pub const fn nothing() -> Self {
        Self {
            items: vec![],
            next_cursor: None,
        }
    }
}

#[derive(Clone, Copy, Deserialize, ToSchema, IntoParams)]
pub struct Pagination {
    pub cursor: u32,
    pub limit: u8,
}
