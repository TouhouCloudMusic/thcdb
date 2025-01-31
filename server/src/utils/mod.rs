pub mod openapi {

    #[derive(Debug)]
    pub enum ContentType {
        Json,
    }

    impl std::fmt::Display for ContentType {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            match self {
                Self::Json => write!(f, "application/json"),
            }
        }
    }

    impl From<ContentType> for String {
        fn from(val: ContentType) -> Self {
            val.to_string()
        }
    }
}
