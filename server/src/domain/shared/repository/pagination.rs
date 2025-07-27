#![expect(clippy::option_if_let_else)]
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

    pub fn map_items<U>(self, f: impl Fn(T) -> U) -> Paginated<U> {
        Paginated {
            items: self.items.into_iter().map(f).collect(),
            next_cursor: self.next_cursor,
        }
    }
}

#[derive(Clone, Copy)]
pub struct Cursor {
    pub at: u32,
    pub limit: u8,
}
