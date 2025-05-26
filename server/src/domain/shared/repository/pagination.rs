use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, ToSchema)]
pub struct Paginated<T> {
    pub items: Vec<T>,
    pub next_cursor: Option<i32>,
}

impl<T> Paginated<T> {
    pub const fn nothing() -> Self {
        Self {
            items: vec![],
            next_cursor: None,
        }
    }
}

#[derive(Clone, Copy)]
pub struct Cursor {
    pub at: u32,
    pub limit: u8,
}
