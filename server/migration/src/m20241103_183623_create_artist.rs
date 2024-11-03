use extension::postgres::Type;
use sea_orm::Iterable;
use sea_orm_migration::{prelude::*, schema::*};

use crate::{date_precision, default_self_id, CreatedAndUpdatedAt};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_type(
                Type::create()
                    .as_enum(ArtistType)
                    .values(ArtistTypeVariants::iter())
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Artist::Table)
                    .if_not_exists()
                    .col(pk_auto(Artist::Id))
                    .col(default_self_id(Artist::ArtistID, Artist::Id))
                    .col(text(Artist::Name))
                    .col(ColumnDef::new(Artist::ArtistType).custom(ArtistType))
                    .col(array_null(Artist::TextAlias, ColumnType::Text))
                    .col(date_null(Artist::StartDate))
                    .col(date_precision(Artist::StartDatePrecision))
                    .col(date_null(Artist::EndDate))
                    .col(date_precision(Artist::EndDatePrecision))
                    .created_at(Artist::CreatedAt)
                    .updated_at(Artist::UpdatedAt)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_type(Type::drop().name(ArtistType).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(Artist::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Artist {
    Table,
    Id,
    ArtistID,
    Name,
    ArtistType,
    TextAlias,
    StartDate,
    StartDatePrecision,
    EndDate,
    EndDatePrecision,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
pub struct ArtistType;

#[derive(DeriveIden, sea_orm::EnumIter)]
enum ArtistTypeVariants {
    Group,
    Person,
}
