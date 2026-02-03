use std::path::PathBuf;

use pico_args::Arguments;
use snafu::{FromString, ResultExt, Whatever};

#[derive(Debug)]
pub(crate) struct CliArgs {
    pub(crate) openapi_out: Option<PathBuf>,
}

impl CliArgs {
    pub(crate) fn parse() -> Result<Self, Whatever> {
        let mut pargs = Arguments::from_env();

        let openapi_out = pargs
            .opt_value_from_os_str("--openapi", |x| {
                Ok::<_, &str>(PathBuf::from(x))
            })
            .with_whatever_context(|e| {
                format!("Failed to parse openapi output path: {e}")
            })?;

        let remaining = pargs.finish();
        if let Some(arg) = remaining.into_iter().next() {
            let arg = arg
                .into_string()
                .unwrap_or_else(|value| value.to_string_lossy().into_owned());
            return Err(Whatever::without_source(format!(
                "Unknown argument: {arg}"
            )));
        }

        Ok(Self { openapi_out })
    }
}
