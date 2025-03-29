#![feature(let_chains)]

use std::fs;

use git2::Repository;
use syn::{BinOp, Expr, Item, Lit, parse_file};

fn main() {
    let _ = dotenvy::dotenv().unwrap();

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

    let mut ts_content = format!("// {comment_msg}");
    let kt_pkg = "net.hearnsoft.tcm.server.constants";
    let mut kt_content = format!(
        "// {comment_msg}\
{kt_pkg}\n
"
    );

    for item in ast.items {
        if let Item::Mod(module) = item
            && module.ident == "share"
            && let Some((_, items)) = module.content
        {
            for item in items {
                if let Item::Const(const_item) = item {
                    let ident = const_item.ident.to_string();
                    let value = match *const_item.expr {
                        Expr::Lit(expr_lit) => match &expr_lit.lit {
                            syn::Lit::Str(s) => format!("\"{}\"", s.value()),
                            syn::Lit::Int(i) => i.to_string(),
                            syn::Lit::Float(f) => f.to_string(),
                            syn::Lit::Bool(b) => b.value.to_string(),
                            _ => panic!("invalid lit"),
                        },
                        Expr::Binary(_) => {
                            eval_binexpr(&const_item.expr).to_string()
                        }
                        _ => panic!("invalid expr {:?}", const_item.expr),
                    };

                    ts_content.push_str(&format!(
                        "export const {} = {};\n",
                        ident, value
                    ));

                    kt_content.push_str(&format!(
                        "const val {} = {};\n",
                        ident, value
                    ));
                }
            }
        }
    }

    let out_dir = "src/constant/gen.rs";

    let mut content = String::new();
    content.push_str(&format!(
        r#"pub const TS_CONSTANTS: &str = r"{ts_content}";"#
    ));
    content.push_str("\n\n");
    content.push_str(&format!(
        r#"pub const KT_CONSTANTS: &str = r"{kt_content}";"#
    ));

    fs::create_dir_all("src/constant").expect("Create dir failed");
    fs::write(out_dir, content.trim()).expect("Failed to write file");

    println!("cargo:rerun-if-changed={}", rust_module_path);
}

fn eval_binexpr(expr: &Expr) -> i64 {
    match expr {
        // 数字字面量（如 `1`, `2`）
        Expr::Lit(lit) => {
            if let Lit::Int(int_lit) = &lit.lit {
                int_lit.base10_parse::<i64>().unwrap()
            } else {
                panic!("Unsupported literal");
            }
        }
        // 二元运算（如 `1 + 2`, `3 * 4`）
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
