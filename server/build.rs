use std::fs;
use std::path::PathBuf;

use quote::ToTokens;
use snafu::Whatever;
use snafu::prelude::*;
use syn::{BinOp, Expr, Item, Lit, parse_file};

#[snafu::report]
fn main() -> Result<(), Whatever> {
    const LINE_BREAK: char = '\n';
    const CONSTANTS_MODULE: &str = "src/constant.rs";
    const GENERATED_MODULE: &str = "constant_gen.rs";

    let content =
        fs::read_to_string(CONSTANTS_MODULE).with_whatever_context(|_| {
            format!("Failed to read {CONSTANTS_MODULE}")
        })?;
    let ast = parse_file(&content).with_whatever_context(|_| {
        format!("Failed to parse constants from {CONSTANTS_MODULE}")
    })?;

    let comment_msg = "Auto-generated from thcdb server\n\n";

    let kt_pkg = "package net.hearnsoft.tcm.server.constants";

    let kt_header = format!(
        "// {comment_msg}\
{kt_pkg}\n
"
    );

    let mut ts_content = Vec::new();
    let mut ts_file_lines = Vec::new();
    let mut kt_content = Vec::new();

    for ast_item in ast.items {
        if let Item::Mod(module) = ast_item
            && module.ident == "share"
            && let Some((_, items)) = module.content
        {
            for item in items {
                if let Item::Const(const_item) = item {
                    let ident = const_item.ident.clone();
                    let right_expr = const_item.expr.clone();

                    if let Some(str) = match *const_item.expr {
                        Expr::Lit(expr_lit) => match &expr_lit.lit {
                            Lit::Str(s) => Some(format!(
                                "\"{}\"",
                                s.value()
                                    .replace('"', r#"\""#)
                                    .replace('\\', r"\\")
                            )),
                            Lit::Int(i) => Some(i.to_string()),
                            Lit::Float(f) => Some(f.to_string()),
                            Lit::Bool(b) => Some(b.value.to_string()),
                            _ => None,
                        },
                        Expr::Binary(_) => {
                            Some(eval_binexpr(&const_item.expr).to_string())
                        }
                        _ => None,
                    } {
                        let ts_line =
                            format!("export const {ident} = {str}{LINE_BREAK}");
                        let kt_line =
                            format!("const val {ident} = {str}{LINE_BREAK}");

                        ts_file_lines.push(ts_line.clone());
                        ts_content.push(rust_string_literal(&ts_line));
                        kt_content.push(rust_string_literal(&kt_line));
                    } else {
                        ts_content.push(format!(
                            r#"format!("export const {ident} = {{}}{LINE_BREAK}", {})"#,
                            right_expr.to_token_stream()
                        ));

                        kt_content.push(format!(
                            r#"format!("const val {ident} = {{}}{LINE_BREAK}", {})"#,
                            right_expr.to_token_stream()
                        ));
                    }
                }
            }
        }
    }

    let out_dir = PathBuf::from(
        std::env::var("OUT_DIR")
            .with_whatever_context(|_| "Missing OUT_DIR".to_string())?,
    );
    let out_path = out_dir.join(GENERATED_MODULE);

    let mut content = String::new();
    content.push_str("use std::sync::LazyLock;\n\n");
    content.push_str(
        "pub static TS_CONSTANTS: LazyLock<String> = LazyLock::new(||{\n",
    );
    content.push_str(&format!(
        r#"    let mut tmp = String::from("// {comment_msg}");{}"#,
        "\n"
    ));
    ts_content.iter().for_each(|str| {
        content.push_str(&format!("    tmp.push_str(({str}).as_ref());\n"));
    });
    content.push_str("tmp\n});");

    content.push_str("\n\n");

    content.push_str(
        "pub static KT_CONSTANTS: LazyLock<String> = LazyLock::new(||{\n",
    );
    content.push_str(&format!(
        r#"    let mut tmp = String::from("{kt_header}");{}"#,
        "\n"
    ));
    kt_content.iter().for_each(|str| {
        content.push_str(&format!("    tmp.push_str(({str}).as_ref());\n"));
    });
    content.push_str("tmp\n});");

    content.push('\n');

    fs::write(&out_path, content.trim()).with_whatever_context(|_| {
        format!("Failed to write {}", out_path.display())
    })?;

    let manifest_dir = PathBuf::from(
        std::env::var("CARGO_MANIFEST_DIR").with_whatever_context(|_| {
            "Missing CARGO_MANIFEST_DIR".to_string()
        })?,
    );
    let web_root = manifest_dir.join("../web");
    if web_root.exists() {
        let web_ts_path = web_root.join("src/constant/server.ts");
        let parent = web_ts_path.parent().with_whatever_context(|| {
            format!("Missing parent for {}", web_ts_path.display())
        })?;
        fs::create_dir_all(parent).with_whatever_context(|_| {
            format!("Failed to create {}", parent.display())
        })?;
        let mut ts_file = String::new();
        ts_file.push_str(&format!("// {comment_msg}"));
        ts_file_lines.iter().for_each(|line| ts_file.push_str(line));
        fs::write(&web_ts_path, ts_file).with_whatever_context(|_| {
            format!("Failed to write {}", web_ts_path.display())
        })?;
        println!("cargo:rerun-if-changed=../web/src/constant/server.ts");
    } else {
        println!(
            "cargo:warning=web directory not found at {}, skipping TS constants generation",
            web_root.display()
        );
    }

    println!("cargo:rerun-if-changed={CONSTANTS_MODULE}");

    Ok(())
}

fn eval_binexpr(expr: &Expr) -> i64 {
    match expr {
        Expr::Lit(lit) => {
            if let Lit::Int(int_lit) = &lit.lit {
                int_lit.base10_parse::<i64>().unwrap()
            } else {
                panic!("Unsupported literal");
            }
        }

        Expr::Binary(bin) => {
            let left = eval_binexpr(&bin.left);
            let right = eval_binexpr(&bin.right);
            match bin.op {
                BinOp::Add(_) => left + right,
                BinOp::Sub(_) => left - right,
                BinOp::Mul(_) => left * right,
                BinOp::Div(_) => left / right,
                _ => panic!("Unsupported operator {:#?}", bin.op),
            }
        }
        _ => panic!("Unsupported expression"),
    }
}

fn rust_string_literal(value: &str) -> String {
    format!("{value:?}")
}
