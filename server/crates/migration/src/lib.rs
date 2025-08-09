use sea_orm_migration::prelude::*;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20250403_165328_init_database::Migration),
            Box::new(m20250415_011212_create_user_following::Migration),
            Box::new(m20250415_021231_simplify_column_names::Migration),
            Box::new(m20250415_034740_fix_release_catalog_num::Migration),
            Box::new(m20250415_143551_add_user_profile_banner::Migration),
            Box::new(m20250421_023142_add_user_bio::Migration),
            Box::new(m20250426_014449_add_artist_location::Migration),
            Box::new(m20250426_174454_remove_join_leave_type::Migration),
            Box::new(m20250427_223913_create_image_queue::Migration),
            Box::new(m20250427_233244_create_artist_image::Migration),
            Box::new(m20250501_115956_add_storage_backend::Migration),
            Box::new(m20250503_123235_rename_group_member::Migration),
            Box::new(m20250509_215750_add_more_artist_location::Migration),
            Box::new(m20250516_062600_image_ref_count::Migration),
            Box::new(m20250605_073000_create_release_image::Migration),
            Box::new(m20250606_140000_defer_user_fkey::Migration),
            Box::new(m20250607_092000_remove_image_ref_count::Migration),
            Box::new(m20250607_095500_seeding_language_data::Migration),
            Box::new(m20250717_000000_create_song_lyrics::Migration),
            Box::new(m20250727_120000_enable_pg_trgm::Migration),
            Box::new(m20250808_153600_add_credit_role_entity_type::Migration),
        ]
    }
}
mod m20250403_165328_init_database;
mod m20250415_011212_create_user_following;
mod m20250415_021231_simplify_column_names;
mod m20250415_034740_fix_release_catalog_num;
mod m20250415_143551_add_user_profile_banner;
mod m20250421_023142_add_user_bio;
mod m20250426_014449_add_artist_location;
mod m20250426_174454_remove_join_leave_type;
mod m20250427_223913_create_image_queue;
mod m20250427_233244_create_artist_image;
mod m20250501_115956_add_storage_backend;
mod m20250503_123235_rename_group_member;
mod m20250509_215750_add_more_artist_location;
mod m20250516_062600_image_ref_count;
mod m20250605_073000_create_release_image;
mod m20250606_140000_defer_user_fkey;
mod m20250607_092000_remove_image_ref_count;
mod m20250607_095500_seeding_language_data;
mod m20250717_000000_create_song_lyrics;
mod m20250727_120000_enable_pg_trgm;
mod m20250808_153600_add_credit_role_entity_type;
