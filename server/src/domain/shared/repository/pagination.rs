pub struct Paginated<T> {
    pub items: Vec<T>,
    pub pagination: Pagination,
}

pub struct Pagination {
    pub total: u32,
    pub offset: u32,
    pub limit: u8,
}
