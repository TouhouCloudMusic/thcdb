pub use sea_orm_migration::prelude::*;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20250403_165328_init_database::Migration),
            Box::new(m20250415_011212_create_user_followings::Migration),
            Box::new(m20250415_021231_simplify_column_names::Migration),
            Box::new(m20250415_034740_fix_release_catalog_num::Migration),
        ]
    }
}
mod m20250403_165328_init_database;
mod m20250415_011212_create_user_followings;
mod m20250415_021231_simplify_column_names;
mod m20250415_034740_fix_release_catalog_num;
