#![expect(clippy::option_if_let_else, reason = "macro")]
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

pub fn total_pages(total_items: u64, page_size: u8) -> u64 {
    debug_assert!(page_size > 0);
    total_items.div_ceil(u64::from(page_size))
}

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
    pub page: u64,
    pub page_size: u8,
    pub total_items: u64,
    pub total_pages: u64,
}

#[derive(Clone, Copy)]
pub struct Cursor {
    pub at: i32,
    pub limit: u8,
}

impl Cursor {
    pub fn offset(self) -> u64 {
        u64::try_from(self.at).unwrap_or(0)
    }

    pub fn into_offset_response<T>(
        self,
        mut items: Vec<T>,
    ) -> CursorResponse<T> {
        let cursor = self.at.max(0);
        let limit = usize::from(self.limit);
        let has_next = items.len() > limit;
        if has_next {
            items.truncate(limit);
        }

        CursorResponse {
            items,
            next_cursor: has_next.then_some(cursor + i32::from(self.limit)),
        }
    }
}

pub const DEFAULT_LIMIT: u8 = 20;
pub const MAX_LIMIT: u8 = 100;
pub const MAX_PAGE: u64 = 10_000;
