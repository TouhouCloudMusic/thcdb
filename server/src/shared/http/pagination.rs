use serde::Deserialize;
use utoipa::IntoParams;

use crate::domain::shared::{DEFAULT_LIMIT, MAX_LIMIT};

#[derive(Debug, Clone, Deserialize, IntoParams)]
pub struct PaginationQuery {
    #[param(minimum = 1, maximum = 100)]
    limit: Option<u32>,
    pub cursor: Option<i32>,
}

impl PaginationQuery {
    pub fn limit(&self) -> u32 {
        self.limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT)
    }
}

#[derive(Debug, Clone, Deserialize, IntoParams)]
pub struct PageQuery {
    #[param(minimum = 1, maximum = 100)]
    limit: Option<u32>,
    #[param(minimum = 1)]
    page: Option<u32>,
}

impl PageQuery {
    pub fn limit(&self) -> u32 {
        self.limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT)
    }

    pub fn page(&self) -> u32 {
        self.page.unwrap_or(1).max(1)
    }
}
