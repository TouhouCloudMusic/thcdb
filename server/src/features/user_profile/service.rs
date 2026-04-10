use entity::user_following;
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, Set};

use crate::domain::user::{ProfileRepository, Repository, User, UserProfile};
use crate::features::user_profile::{FollowResult, UnfollowResult};
use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::infra::error::Error;

#[derive(Clone)]
pub struct Service {
    repo: SeaOrmRepository,
}

impl Service {
    pub const fn new(repo: SeaOrmRepository) -> Self {
        Self { repo }
    }

    pub async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Option<UserProfile>, Error> {
        ProfileRepository::find_by_name(&self.repo, name)
            .await
            .map_err(Error::from)
    }

    pub async fn with_following(
        &self,
        profile: &mut UserProfile,
        current_user: &User,
    ) -> Result<(), Error> {
        self.repo
            .with_following(profile, current_user)
            .await
            .map_err(Error::from)
    }

    pub async fn find_user_by_name(
        &self,
        name: &str,
    ) -> Result<Option<User>, Error> {
        Repository::find_by_name(&self.repo, name)
            .await
            .map_err(Error::from)
    }

    pub async fn follow(
        &self,
        current_user_id: i32,
        target_user_id: i32,
    ) -> Result<FollowResult, Error> {
        if current_user_id == target_user_id {
            return Err(Error::custom(&"cannot follow yourself"));
        }

        let exists = user_following::Entity::find()
            .filter(user_following::Column::UserId.eq(current_user_id))
            .filter(user_following::Column::FollowingId.eq(target_user_id))
            .count(&self.repo.conn)
            .await
            .map_err(Error::from)?;

        if exists > 0 {
            return Ok(FollowResult::AlreadyFollowing);
        }

        let _ = user_following::Entity::insert(user_following::ActiveModel {
            user_id: Set(current_user_id),
            following_id: Set(target_user_id),
            following_at: Set(Some(chrono::Utc::now().into())),
        })
        .exec(&self.repo.conn)
        .await
        .map_err(Error::from)?;

        Ok(FollowResult::Followed)
    }

    pub async fn unfollow(
        &self,
        current_user_id: i32,
        target_user_id: i32,
    ) -> Result<UnfollowResult, Error> {
        let res = user_following::Entity::delete_many()
            .filter(user_following::Column::UserId.eq(current_user_id))
            .filter(user_following::Column::FollowingId.eq(target_user_id))
            .exec(&self.repo.conn)
            .await
            .map_err(Error::from)?;

        if res.rows_affected > 0 {
            Ok(UnfollowResult::Unfollowed)
        } else {
            Ok(UnfollowResult::NotFollowing)
        }
    }
}
