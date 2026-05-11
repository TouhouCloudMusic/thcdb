use std::backtrace::Backtrace;

#[derive(Debug, snafu::Snafu)]
#[snafu(display(
    "Invalid field: {field}, expected: {expected}, received: {received}."
))]
pub struct InvalidField {
    pub field: String,
    pub expected: String,
    pub received: String,
    backtrace: Backtrace,
}

#[derive(Debug, snafu::Snafu)]
#[snafu(display("Unauthorized"))]
pub struct Unauthorized {
    backtrace: Backtrace,
}

#[derive(Debug, snafu::Snafu)]
#[snafu(display("{entity_type} #{entity_id} not found"))]
pub struct EntityNotFound {
    pub entity_id: i32,
    pub entity_type: &'static str,
    backtrace: Backtrace,
}

impl InvalidField {
    pub fn new(field: String, expected: String, received: String) -> Self {
        Self {
            field,
            expected,
            received,
            backtrace: Backtrace::capture(),
        }
    }
}

impl Unauthorized {
    pub fn new() -> Self {
        Self {
            backtrace: Backtrace::capture(),
        }
    }
}

impl Default for Unauthorized {
    fn default() -> Self {
        Self::new()
    }
}

impl EntityNotFound {
    pub fn new(entity_id: i32, entity_type: &'static str) -> Self {
        Self {
            entity_id,
            entity_type,
            backtrace: Backtrace::capture(),
        }
    }
}
