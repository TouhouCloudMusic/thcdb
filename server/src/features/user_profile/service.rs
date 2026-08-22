use entity::user_following;
use infra_db::SeaOrmRepository;
use sea_orm::{
    ColumnTrait, EntityTrait, QueryFilter, Set, TryInsert, TryInsertResult,
};
use sea_query::{OnConflict, all};

use crate::features::auth;
use crate::features::user::User;
use crate::features::user_event::{UserEvent, UserEventSender};
use crate::features::user_profile::{
    Error, FollowResult, UnfollowResult, UserProfile, repo,
};
use crate::infra::database::error::DatabaseResultExt;

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

    pub async fn find_user_by_name(
        &self,
        name: &str,
    ) -> Result<Option<User>, Error> {
        let user = auth::repo::find_by_name(&self.repo.conn, name).await?;

        Ok(user)
    }

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
            .db_operation("begin user follow transaction")?;
        let conn = tx_repo.conn();

        if auth::repo::find_by_id(conn, target_user_id)
            .await?
            .as_ref()
            .is_none_or(|user| !user.email_verified)
        {
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
        .db_operation("create user follow relationship")?;

        match inserted {
            TryInsertResult::Inserted(_) => {
                let notification_recipients =
                    user_profile_notification::create_user_followed_notification(
                        conn,
                        user_profile_notification::FollowerId(current_user_id),
                        user_profile_notification::FollowedUserId(target_user_id),
                    )
                    .await
                    .map_err(
                        crate::infra::database::error::DatabaseError::from,
                    )?;

                tx_repo.commit().await.map_err(
                    crate::infra::database::error::DatabaseError::from,
                )?;

                self.user_events.publish(
                    UserEvent::NotificationInboxUpdated,
                    notification_recipients.user_ids,
                );

                Ok(FollowResult::Followed)
            }
            TryInsertResult::Conflicted => {
                tx_repo.commit().await.map_err(
                    crate::infra::database::error::DatabaseError::from,
                )?;

                Ok(FollowResult::AlreadyFollowing)
            }
            TryInsertResult::Empty => {
                unreachable!("TryInsert::one returned Empty")
            }
        }
    }

    pub async fn unfollow(
        &self,
        current_user_id: i32,
        target_user_id: i32,
    ) -> Result<UnfollowResult, Error> {
        let res = user_following::Entity::delete_many()
            .filter(all![
                user_following::Column::UserId.eq(current_user_id),
                user_following::Column::FollowingId.eq(target_user_id),
            ])
            .exec(&self.repo.conn)
            .await
            .db_operation("delete user follow relationship")?;

        if res.rows_affected > 0 {
            Ok(UnfollowResult::Unfollowed)
        } else {
            Ok(UnfollowResult::NotFollowing)
        }
    }
}
