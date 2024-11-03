use extension::postgres::Type;
use sea_orm::Iterable;
use sea_orm_migration::{prelude::*, schema::*};

use crate::CreatedAndUpdatedAt;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(User::Table)
                    .if_not_exists()
                    .col(pk_auto(User::Id))
                    .col(text(User::Name))
                    .col(text(User::Password))
                    .created_at(User::CreatedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_type(
                extension::postgres::Type::create()
                    .as_enum(DatePrecision)
                    .values(DatePrecisionVariants::iter())
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(User::Table).to_owned())
            .await?;

        manager
            .drop_type(Type::drop().name(DatePrecision).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
    Name,
    Password,
    CreatedAt,
}

#[derive(DeriveIden)]
pub struct DatePrecision;

#[derive(DeriveIden, sea_orm::EnumIter)]
pub enum DatePrecisionVariants {
    Day,
    Month,
    Year,
}
