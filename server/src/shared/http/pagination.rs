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
