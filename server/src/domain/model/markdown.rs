use std::backtrace::Backtrace;
use std::sync::LazyLock;

use axum::http::StatusCode;
use derive_more::Display;
use macros::{ApiError, IntoErrorSchema};
use pulldown_cmark::{Event, Options, Parser, TextMergeStream};

#[derive(Debug, Clone, Display)]
pub struct Markdown(String);

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
#[snafu(display("{kind}"))]
#[api_error(
    status_code = StatusCode::BAD_REQUEST,
)]
pub struct Error {
    pub kind: ErrorKind,
    pub backtrace: Backtrace,
}

impl From<ErrorKind> for Error {
    fn from(kind: ErrorKind) -> Self {
        Self {
            kind,
            backtrace: Backtrace::capture(),
        }
    }
}

#[derive(Debug, Display)]
pub enum ErrorKind {
    #[display("Invalid markdown")]
    ContainsHtml,
}

static OPTIONS: LazyLock<Options> = LazyLock::new(|| {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);
    options
});

impl Markdown {
    pub fn parse(markdown: impl Into<String>) -> Result<Self, Error> {
        fn inner(markdown: String) -> Result<Markdown, Error> {
            let parser = Parser::new_ext(&markdown, *OPTIONS);
            let stream = TextMergeStream::new(parser);
            for event in stream {
                match event {
                    Event::Html(_) | Event::InlineHtml(_) => {
                        return Err(ErrorKind::ContainsHtml.into());
                    }
                    _ => {}
                }
            }
            Ok(Markdown(markdown))
        }

        inner(markdown.into())
    }

    pub fn new_unchecked(markdown: impl Into<String>) -> Self {
        Self(markdown.into())
    }
}

impl Markdown {
    pub const fn as_str(&self) -> &str {
        self.0.as_str()
    }
}

impl TryFrom<String> for Markdown {
    type Error = Error;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        Self::parse(value)
    }
}

impl From<Markdown> for String {
    fn from(val: Markdown) -> Self {
        val.0
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn display() {
        let markdown = Markdown::parse("Hello **world**").unwrap();
        assert_eq!(markdown.as_str(), "Hello **world**");
        assert_eq!(markdown.0, "Hello **world**");
    }

    #[test]
    fn parse_invalid() {
        let err = Markdown::parse("<script>alert('xss')</script>").unwrap_err();
        assert_eq!(err.to_string(), "Invalid markdown");
    }
}
