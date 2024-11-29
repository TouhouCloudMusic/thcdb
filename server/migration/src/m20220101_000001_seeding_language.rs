use sea_orm_migration::prelude::*;

use crate::sea_orm::ActiveValue::Set;
use crate::sea_orm::EntityTrait;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        use entity::language;

        let data = [
            ("Cantonese", "yue"),
            ("Chinese", "zho"),
            ("English", "eng"),
            ("Finnish", "fin"),
            ("French", "fra"),
            ("German", "deu"),
            ("Italian", "ita"),
            ("Japanese", "jpn"),
            ("Korean", "kor"),
            ("Latin", "lat"),
            ("Min Nan Chinese", "nan"),
            ("Polish", "pol"),
            ("Russian", "rus"),
            ("Spanish", "spa"),
            ("Swedish", "swe"),
        ];

        let db = manager.get_connection();

        language::Entity::insert_many(data.map(|(name, code)| {
            language::ActiveModel {
                name: Set(name.to_string()),
                code: Set(code.to_string()),
                ..Default::default()
            }
        }))
        .exec(db)
        .await?;

        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        panic!("Don't drop this migration");
    }
}
