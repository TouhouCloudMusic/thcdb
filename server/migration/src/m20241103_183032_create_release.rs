use extension::postgres::Type;
use sea_orm::{EnumIter, Iterable};
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
                    .as_enum(ReleaseType)
                    .values(ReleaseTypeVariants::iter())
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Release::Table)
                    .if_not_exists()
                    .col(pk_auto(Release::Id))
                    .col(default_self_id(Release::ReleaseId, Release::Id))
                    .col(text(Release::Title))
                    .col(integer_null(Release::PrevId))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_releases_prev_id")
                            .from(Release::Table, Release::PrevId)
                            .to(Release::Table, Release::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .col(integer_null(Release::NextId))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_releases_next_id")
                            .from(Release::Table, Release::NextId)
                            .to(Release::Table, Release::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .col(date_time_null(Release::ReleaseDate))
                    .col(date_precision(Release::ReleaseDatePrecision))
                    .col(date_time_null(Release::RecordingDateStart))
                    .col(date_precision(Release::RecordingDateStartPrecision))
                    .col(date_time_null(Release::RecordingDateEnd))
                    .col(date_precision(Release::RecordingDateEndPrecision))
                    .col(text_null(Release::CatalogNumber))
                    .col(integer_null(Release::TotalDisc))
                    .created_at(Release::CreatedAt)
                    .updated_at(Release::UpdatedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_type(Type::drop().name(ReleaseType).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(Release::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
struct ReleaseType;

#[derive(DeriveIden, EnumIter)]
enum ReleaseTypeVariants {
    Album,
    EP,
    Single,
}

#[derive(DeriveIden)]
enum Release {
    Table,
    Id,
    ReleaseId,
    Title,
    PrevId,
    NextId,
    ReleaseDate,
    ReleaseDatePrecision,
    RecordingDateStart,
    RecordingDateStartPrecision,
    RecordingDateEnd,
    RecordingDateEndPrecision,
    CatalogNumber,
    TotalDisc,
    CreatedAt,
    UpdatedAt,
}
