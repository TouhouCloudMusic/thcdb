mod http;
mod service;

pub use http::{DataUserProfile, load_profile, router};
pub use service::Service;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FollowResult {
    Followed,
    AlreadyFollowing,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UnfollowResult {
    Unfollowed,
    NotFollowing,
}
