#[derive(Debug, PartialEq, Eq)]
pub enum ErrorKind {
    InvalidMetadata,
    InvalidTag,
    InvalidTimestamp,
    MetadataAfterLyrics,
    MissingBrackets,
}

#[derive(Debug)]
pub struct Error {
    pub line: usize,
    pub kind: ErrorKind,
}

impl Error {
    pub fn new(kind: ErrorKind, line: usize) -> Self {
        Self { kind, line }
    }
}

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match &self.kind {
            ErrorKind::InvalidTimestamp => {
                write!(f, "Invalid timestamp format at line {}", self.line)
            }
            ErrorKind::InvalidMetadata => {
                write!(f, "Invalid metadata format at line {}", self.line)
            }
            ErrorKind::InvalidTag => {
                write!(f, "Invalid tag format at line {}", self.line)
            }
            ErrorKind::MetadataAfterLyrics => {
                write!(f, "Metadata found after lyrics at line {}", self.line)
            }
            ErrorKind::MissingBrackets => {
                write!(f, "Missing brackets at line {}", self.line)
            }
        }
    }
}

impl std::error::Error for Error {}
