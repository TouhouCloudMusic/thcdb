#![feature(let_chains)]

use std::fs;

use git2::Repository;
use quote::ToTokens;
use syn::{BinOp, Expr, Item, Lit, parse_file};

fn main() {
    const LINE_BREAK: char = '\n';
    let _ = dotenvy::dotenv().expect(".env file not found");

    let commit_hash = if let Ok(repo) = Repository::open(".")
        && let Ok(head) = repo.head()
    {
        let commit = head.peel_to_commit().unwrap();
        let hash = commit.id().to_string();
        let short_hash = &hash[..7];

        short_hash.to_string()
    } else {
        panic!("Unable get git commit hash");
    };

    let rust_module_path = "src/constant.rs";
    let content = fs::read_to_string(rust_module_path).unwrap();
    let ast = parse_file(&content).unwrap();

    let comment_msg =
        format!("Auto-generated from thcdb server #{commit_hash}\n\n");

    let kt_pkg = "package net.hearnsoft.tcm.server.constants";

    let kt_header = format!(
        "// {comment_msg}\
{kt_pkg}\n
"
    );

    let mut ts_content = Vec::new();
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
                        ts_content.push(format!(
                            r##"r#"export const {ident} = {str}{LINE_BREAK}"#"##,
                        ));

                        kt_content.push(format!(
                            r##"r#"const val {ident} = {str}{LINE_BREAK}"#"##
                        ));
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

    let out_dir = "src/constant/gen.rs";

    let mut content = String::new();
    content.push_str("#![allow(clippy::all, unused_imports, clippy::needless_raw_string_hashes)]\nuse std::sync::LazyLock;\nuse crate::constant::*;\n\n");
    content.push_str(
        "pub static TS_CONSTANTS: LazyLock<String> = LazyLock::new(||{\n",
    );
    content.push_str(&format!(
        r#"    let mut tmp = String::from("// {comment_msg}");{}"#,
        "\n"
    ));
    ts_content.iter().for_each(|str| {
        content.push_str(&format!("    tmp.push_str(&{});\n", str));
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
        content.push_str(&format!("    tmp.push_str(&{});\n", str));
    });
    content.push_str("tmp\n});");

    content.push('\n');

    fs::create_dir_all("src/constant").expect("Create dir failed");
    fs::write(out_dir, content.trim()).expect("Failed to write file");

    println!("cargo:rerun-if-changed={}", rust_module_path);
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
