mod model;
mod pagination;
pub use model::*;
pub use pagination::*;

pub mod query_kind {
    pub struct Ref;
    pub struct Summary;
    pub struct Full;
}
