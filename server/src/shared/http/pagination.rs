use domain::shared::{
    Cursor, DEFAULT_LIMIT, MAX_LIMIT, MAX_PAGE, PageResponse, total_pages,
};
use serde::Deserialize;
use utoipa::IntoParams;

#[derive(Debug, Clone, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct PaginationQuery {
    #[param(minimum = 1, maximum = 100)]
    limit: Option<u8>,
    pub cursor: Option<i32>,
}

impl PaginationQuery {
    pub fn limit(&self) -> u8 {
        self.limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT)
    }
}

impl From<PaginationQuery> for Cursor {
    fn from(value: PaginationQuery) -> Self {
        Self {
            at: value.cursor.unwrap_or(0),
            limit: value.limit(),
        }
    }
}

#[derive(Debug, Clone, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct PageQuery {
    #[param(minimum = 1, maximum = 100)]
    limit: Option<u8>,
    #[param(minimum = 1, maximum = 10000)]
    page: Option<u64>,
}

impl PageQuery {
    pub fn limit(&self) -> u8 {
        self.limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT)
    }

    pub fn page(&self) -> u64 {
        self.page.unwrap_or(1).clamp(1, MAX_PAGE)
    }

    pub fn offset(&self) -> u64 {
        (self.page() - 1) * u64::from(self.limit())
    }

    pub fn to_response<T>(
        &self,
        items: Vec<T>,
        total_items: u64,
    ) -> PageResponse<T> {
        let page_size = self.limit();

        PageResponse {
            items,
            page: self.page(),
            page_size,
            total_items,
            total_pages: total_pages(total_items, page_size),
        }
    }
}
