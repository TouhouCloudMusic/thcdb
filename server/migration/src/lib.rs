use std::any::Any;

use m20220101_000001_create_tables::{DatePrecision, DatePrecisionVariants};
pub use sea_orm_migration::prelude::*;
use sea_orm_migration::{prelude::*, schema::*};

mod m20220101_000001_create_tables;
mod m20241103_183032_create_release;
mod m20241103_183623_create_artist;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20220101_000001_create_tables::Migration),
            Box::new(m20241103_183032_create_release::Migration),
            Box::new(m20241103_183623_create_artist::Migration),
        ]
    }
}

pub fn default_self_id<T: IntoIden, U: IntoIden + 'static>(
    entity_id: T,
    table_id: U,
) -> ColumnDef {
    ColumnDef::new(entity_id)
        .integer()
        .default(Expr::col(table_id))
        .not_null()
        .to_owned()
}

pub fn date_precision<T: IntoIden>(column: T) -> ColumnDef {
    ColumnDef::new(column)
        .custom(DatePrecision)
        .not_null()
        .default(0)
        .to_owned()
}

trait CreatedAndUpdatedAt {
    fn created_at<T: IntoIden>(&mut self, column: T) -> &mut Self;
    fn updated_at<T: IntoIden>(&mut self, column: T) -> &mut Self;
}

impl CreatedAndUpdatedAt for TableCreateStatement {
    fn created_at<T: IntoIden>(&mut self, column: T) -> &mut Self {
        self.col(
            ColumnDef::new(column)
                .timestamp_with_time_zone()
                .default(Expr::current_timestamp())
                .not_null(),
        )
    }

    fn updated_at<T: IntoIden>(&mut self, column: T) -> &mut Self {
        self.col(
            ColumnDef::new(column)
                .timestamp_with_time_zone()
                .default(Expr::current_timestamp())
                .not_null(),
        )
    }
}
