use entity::user_following;
use infra_db::SeaOrmRepository;
use sea_orm::{
    ColumnTrait, EntityTrait, QueryFilter, Set, TryInsert, TryInsertResult,
};
use sea_query::{OnConflict, all};

use crate::features::user::User;
use crate::features::user_event::{UserEvent, UserEventSender};
use crate::features::user_profile::{
    Error, FollowResult, UnfollowResult, UserProfile, repo,
};
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

#[cfg(all(test, feature = "integration-test"))]
mod tests;

#[derive(Clone)]
pub struct Service {
    pub(crate) repo: SeaOrmRepository,
    pub(crate) user_events: UserEventSender,
}

impl Service {
    pub async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<UserProfile>, Error> {
        let profile = repo::find_by_name(&self.repo, name).await?;

        Ok(profile)
    }

    pub async fn with_following(
        &self,
        profile: &mut UserProfile,
        current_user: &User,
    ) -> Result<(), Error> {
        repo::with_following(&self.repo, profile, current_user).await?;

        Ok(())
    }

    pub(crate) async fn find_user_id_by_name(
        &self,
        name: &str,
    ) -> Result<Option<i32>, Error> {
        let user_id = repo::find_user_id_by_name(&self.repo, name).await?;

        Ok(user_id)
    }

    #[fastrace::trace(name = "user_profile.follow")]
    pub async fn follow(
        &self,
        current_user_id: i32,
        target_user_id: i32,
    ) -> Result<FollowResult, Error> {
        if current_user_id == target_user_id {
            return Err(Error::CannotFollowSelf);
        }

        let tx_repo = self
            .repo
            .begin_tx()
            .await
            .db_context("begin user follow transaction")?;
        let conn = tx_repo.conn();
        if !repo::is_user_email_verified(conn, target_user_id).await? {
            return Err(Error::NotFound);
        }

        let inserted = TryInsert::one(user_following::ActiveModel {
            user_id: Set(current_user_id),
            following_id: Set(target_user_id),
            following_at: Set(Some(chrono::Utc::now().into())),
        })
        .on_conflict(
            OnConflict::columns([
                user_following::Column::UserId,
                user_following::Column::FollowingId,
            ])
            .do_nothing()
            .to_owned(),
        )
        .exec(conn)
        .await
        .db_context("create user follow relationship")?;

        let notification_recipients = match inserted {
            TryInsertResult::Inserted(_) => Some(
                user_profile_notification::create_user_followed_notification(
                    conn,
                    user_profile_notification::FollowerId(current_user_id),
                    user_profile_notification::FollowedUserId(target_user_id),
                )
                .await
                .map_err(DatabaseError::from)?,
            ),
            TryInsertResult::Conflicted => None,
            TryInsertResult::Empty => {
                unreachable!("TryInsert::one returned Empty")
            }
        };
        tx_repo.commit().await.map_err(DatabaseError::from)?;

        if let Some(notification_recipients) = notification_recipients {
            self.user_events.publish(
                UserEvent::NotificationInboxUpdated,
                notification_recipients.user_ids,
            );
            Ok(FollowResult::Followed)
        } else {
            Ok(FollowResult::AlreadyFollowing)
        }
    }

    #[fastrace::trace(name = "user_profile.unfollow")]
    pub async fn unfollow(
        &self,
        current_user_id: i32,
        target_user_id: i32,
    ) -> Result<UnfollowResult, Error> {
        let deletion = user_following::Entity::delete_many()
            .filter(all![
                user_following::Column::UserId.eq(current_user_id),
                user_following::Column::FollowingId.eq(target_user_id),
            ])
            .exec(&self.repo.conn)
            .await
            .db_context("delete user follow relationship")?;
        if deletion.rows_affected > 0 {
            Ok(UnfollowResult::Unfollowed)
        } else {
            Ok(UnfollowResult::NotFollowing)
        }
    }
}
