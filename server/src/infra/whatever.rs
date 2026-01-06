use std::fmt::Write;

use snafu::Snafu;

#[derive(Debug, Snafu)]
#[snafu(whatever)]
#[snafu(display("{}", self.display()))]
pub(crate) struct InfraWhatever {
    #[snafu(source(from(Box<dyn std::error::Error + Send + Sync>, Some)))]
    source: Option<Box<dyn std::error::Error + Send + Sync>>,
    message: String,
}

impl InfraWhatever {
    fn display(&self) -> String {
        let mut buf = String::with_capacity(64);

        buf.push_str(&self.message);

        if let Some(source) = &self.source {
            buf.push('\n');
            write!(&mut buf, "Cause: {source}").unwrap();
        }

        buf
    }
}

impl From<String> for InfraWhatever {
    fn from(message: String) -> Self {
        Self {
            source: None,
            message,
        }
    }
}

