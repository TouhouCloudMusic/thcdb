#![expect(dead_code)]
use std::fmt::Write;

use sea_orm::Iden;
use sea_orm::sea_query::{Func, FunctionCall, SimpleExpr};

pub struct PgFuncExt;

impl PgFuncExt {
    pub fn array_agg<T>(expr: T) -> FunctionCall
    where
        T: Into<SimpleExpr>,
    {
        Func::cust(ArrayAgg).arg(expr)
    }

    pub fn now() -> FunctionCall {
        Func::cust(Now)
    }
}

struct ArrayAgg;

// https://github.com/SeaQL/sea-query/pull/846
impl Iden for ArrayAgg {
    fn unquoted(&self, s: &mut dyn Write) {
        write!(s, "ARRAY_AGG").unwrap();
    }
}

struct Now;

impl Iden for Now {
    fn unquoted(&self, s: &mut dyn Write) {
        write!(s, "Now").unwrap();
    }
}
