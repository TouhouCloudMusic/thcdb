use std::sync::LazyLock;

use derive_more::Display;
use pulldown_cmark::{Event, Options, Parser, TextMergeStream};

#[derive(Debug, Clone, Display)]
pub struct Markdown(String);

static OPTIONS: LazyLock<Options> = LazyLock::new(|| {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);
    options
});

impl Markdown {
    pub fn parse(markdown: impl Into<String>) -> Result<Self, ()> {
        fn inner(markdown: String) -> Result<Markdown, ()> {
            let parser = Parser::new_ext(&markdown, *OPTIONS);
            let stream = TextMergeStream::new(parser);
            for event in stream {
                match event {
                    Event::Html(_) | Event::InlineHtml(_) => {
                        return Err(());
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
        assert!(Markdown::parse("<script>alert('xss')</script>").is_err());
    }
}
