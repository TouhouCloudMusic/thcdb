use sea_orm_migration::prelude::*;

pub struct Migrator;

macro_rules! migrations {
    ($($path:ident),+ $(,)?) => {
        $(mod $path;)+

        #[async_trait::async_trait]
        impl MigratorTrait for Migrator {
            fn migrations() -> Vec<Box<dyn MigrationTrait>> {
                vec![
                    $(Box::new($path::Migration)),+
                ]
            }
        }
    };
}

migrations![
    m20250403_165328_init_database,
    m20250415_011212_create_user_following,
    m20250415_021231_simplify_column_names,
    m20250415_034740_fix_release_catalog_num,
    m20250415_143551_add_user_profile_banner,
    m20250421_023142_add_user_bio,
    m20250426_014449_add_artist_location,
    m20250426_174454_remove_join_leave_type,
    m20250427_223913_create_image_queue,
    m20250427_233244_create_artist_image,
    m20250501_115956_add_storage_backend,
    m20250503_123235_rename_group_member,
    m20250509_215750_add_more_artist_location,
    m20250516_062600_image_ref_count,
    m20250605_073000_create_release_image,
    m20250606_140000_defer_user_fkey,
    m20250607_092000_remove_image_ref_count,
    m20250607_095500_seeding_language_data,
    m20250717_000000_create_song_lyrics,
    m20250727_120000_enable_pg_trgm,
    m20250808_153600_add_credit_role_entity_type,
    m20250828_124137_change_duration_to_integer,
    m20250901_053512_create_release_disc,
];

macro_rules! migration {
    ($name:ident) => {
        use sea_orm_migration::prelude::*;
        pub struct Migration;

        impl MigrationName for Migration {
            fn name(&self) -> &str {
                stringify! {$name}
            }
        }

        #[async_trait::async_trait]
        impl MigrationTrait for Migration {
            async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
                let db = manager.get_connection();

                db.execute_unprepared(include_str!("up.sql")).await?;

                Ok(())
            }

            async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
                let db = manager.get_connection();

                db.execute_unprepared(include_str!("down.sql")).await?;

                Ok(())
            }
        }
    };
}
use migration;
