use crate::model::UnreadCount;
use crate::{Error, Service};

mod repo;

impl Service {
    /// Returns the user's unread notification count, capped at 100.
    pub async fn unread_count(
        &self,
        user_id: i32,
    ) -> Result<UnreadCount, Error> {
        const MAX_UNREAD_COUNT: u64 = 100;

        let count =
            repo::count(&self.repo.conn, user_id, MAX_UNREAD_COUNT).await?;

        let Ok(count) = u8::try_from(count) else {
            unreachable!("unread notification count exceeds its query cap");
        };

        Ok(UnreadCount { count })
    }
}
