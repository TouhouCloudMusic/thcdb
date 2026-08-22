use sea_orm::prelude::Uuid;

use crate::{Error, Service};

mod repo;

impl Service {
    pub async fn save(
        &self,
        user_id: i32,
        notification_id: Uuid,
    ) -> Result<(), Error> {
        if repo::save(&self.repo.conn, user_id, notification_id).await? == 0 {
            Err(Error::NotFound)
        } else {
            Ok(())
        }
    }

    pub async fn unsave(
        &self,
        user_id: i32,
        notification_id: Uuid,
    ) -> Result<(), Error> {
        if repo::unsave(&self.repo.conn, user_id, notification_id).await? == 0 {
            Err(Error::NotFound)
        } else {
            Ok(())
        }
    }
}
