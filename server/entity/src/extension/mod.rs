// mod graphql;
mod impl_enums;
mod into_active_model;
mod into_active_value;
mod model_conversion;
use axum_login::AuthUser;
// pub use graphql::GqlScalarValue;

impl AuthUser for super::entities::user::Model {
    type Id = i32;

    fn id(&self) -> Self::Id {
        self.id
    }

    fn session_auth_hash(&self) -> &[u8] {
        self.password.as_bytes()
    }
}

mod impl_relation {
    use sea_orm::{EntityTrait, Related, RelationDef};

    use crate::entities::*;

    macro_rules! impl_polymorphic_relation {
    (
        [$($table:ident),+ $(,)?],
        ($polymorphic_table:ident, $polymorphic_column:ident) $(,)?) => {
        $(
            impl Related<$table::Entity> for $polymorphic_table::Entity {
                fn to() -> RelationDef {
                    $polymorphic_table::Entity::belongs_to($table::Entity)
                        .from($polymorphic_table::Column::$polymorphic_column)
                        .to($table::Column::Id)
                        .into()
                }
            }

            impl Related<$polymorphic_table::Entity> for $table::Entity {
                fn to() -> RelationDef {
                    $table::Entity::has_one($polymorphic_table::Entity).into()
                }
            }
        )+
    };
}

    impl_polymorphic_relation! {
        [
            artist,
            event,
            label,
            release,
            song,
            tag,
        ],
        (correction, EntityId)
    }
}
