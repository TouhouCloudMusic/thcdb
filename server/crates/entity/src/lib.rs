#[rustfmt::skip]
mod entities;
mod ext;
pub use ext::relation;

#[rustfmt::skip]
pub use entities::*;

pub use entities::sea_orm_active_enums as enums;

// pub use extension::GqlScalarValue;
