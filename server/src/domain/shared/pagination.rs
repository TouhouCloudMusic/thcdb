#![expect(clippy::option_if_let_else, reason = "macro")]
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, ToSchema)]
pub struct CursorResponse<T> {
    pub items: Vec<T>,
    pub next_cursor: Option<i32>,
}

impl<T> Default for CursorResponse<T> {
    fn default() -> Self {
        Self {
            items: Vec::new(),
            next_cursor: None,
        }
    }
}

impl<T> CursorResponse<T> {
    pub fn map<U>(self, f: impl Fn(T) -> U) -> CursorResponse<U> {
        CursorResponse {
            items: self.items.into_iter().map(f).collect(),
            next_cursor: self.next_cursor,
        }
    }
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct PageResponse<T> {
    pub items: Vec<T>,
    pub page: u32,
    pub page_size: u32,
    pub total_items: u64,
    pub total_pages: u32,
}

#[derive(Clone, Copy)]
pub struct Cursor {
    pub at: i32,
    pub limit: u8,
}

pub const DEFAULT_LIMIT: u32 = 20;
pub const MAX_LIMIT: u32 = 100;
