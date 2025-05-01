#[rustfmt::skip]
mod entities;
mod extension;
pub use extension::relation;

#[rustfmt::skip]
pub use entities::*;

pub use entities::sea_orm_active_enums as enums;

// pub use extension::GqlScalarValue;
