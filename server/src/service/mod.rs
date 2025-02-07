pub mod artist;
pub mod correction;
pub mod image;
pub mod juniper;
pub mod release;
pub mod song;
pub mod tag;
pub mod user;

macro_rules! def_service {
    () => {
        #[derive(Clone)]
        pub struct Service {
            db: ::sea_orm::DatabaseConnection,
        }

        impl Service {
            pub const fn new(db: ::sea_orm::DatabaseConnection) -> Self {
                Self { db }
            }
        }
    };
}

use def_service;
