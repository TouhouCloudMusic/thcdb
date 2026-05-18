pub mod admin;
pub mod artist;
pub mod artist_image;
pub mod auth;
pub mod comment;
pub mod correction;
pub mod credit_role;
pub mod enum_table;
pub mod event;
pub mod home;
pub mod image_metadata;
pub(crate) mod image_queue;
pub(crate) mod image_upload;
pub mod label;
pub mod notification;
pub mod release;
pub mod release_image;
pub mod search;
pub mod shared;
pub mod song;
pub mod song_lyrics;
pub mod tag;
mod tag_vote;
pub mod user;
pub mod user_collection;
pub mod user_image;
pub mod user_profile;

use utoipa_axum::router::OpenApiRouter;

use crate::adapter::inbound::rest::state::ArcAppState;

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .merge(admin::router())
        .merge(artist::router())
        .merge(auth::router())
        .merge(comment::router())
        .merge(correction::router())
        .merge(credit_role::router())
        .merge(enum_table::router())
        .merge(event::router())
        .merge(home::router())
        .merge(image_queue::router())
        .merge(label::router())
        .merge(notification::router())
        .merge(release::router())
        .merge(search::router())
        .merge(song::router())
        .merge(song_lyrics::router())
        .merge(tag::router())
        .merge(tag_vote::router())
        .merge(user::router())
        .merge(user_collection::router())
        .merge(user_profile::router())
}
