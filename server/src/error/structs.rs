use std::fmt::Display;

#[derive(Debug)]
pub struct InvalidField {
    pub field: String,
    pub expected: String,
    pub accepted: String,
}

impl Display for InvalidField {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Invalid field: {}, expected: {}, accepted: {}.",
            self.field, self.expected, self.accepted
        )
    }
}

impl std::error::Error for InvalidField {}
