#[derive(Debug)]
pub enum ContentType {
    Json,
    Text,
}

impl std::fmt::Display for ContentType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Json => write!(f, "application/json"),
            Self::Text => write!(f, "text/plain"),
        }
    }
}

impl From<ContentType> for String {
    fn from(val: ContentType) -> Self {
        val.to_string()
    }
}
