use std::fs;
use std::path::PathBuf;

use snafu::Whatever;
use snafu::prelude::*;

#[snafu::report]
fn main() -> Result<(), Whatever> {
    const GENERATED_MODULE: &str = "constant_gen.rs";

    let out_dir = PathBuf::from(
        std::env::var("OUT_DIR")
            .with_whatever_context(|_| "Missing OUT_DIR".to_string())?,
    );
    let out_path = out_dir.join(GENERATED_MODULE);

    fs::write(&out_path, generated_module()).with_whatever_context(|_| {
        format!("Failed to write {}", out_path.display())
    })?;

    println!("cargo:rerun-if-changed=crates/constants/Cargo.toml");
    println!("cargo:rerun-if-changed=crates/constants/src/lib.rs");

    Ok(())
}

fn generated_module() -> String {
    format!(
        "pub const TS_CONSTANTS: &str = {};\n\npub const KT_CONSTANTS: &str = {};\n",
        rust_string_literal(&constants::ts_constants()),
        rust_string_literal(&constants::kt_constants()),
    )
}

fn rust_string_literal(value: &str) -> String {
    format!("{value:?}")
}
