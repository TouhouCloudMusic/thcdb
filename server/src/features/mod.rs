pub mod admin;
pub mod artist;
pub mod artist_image;
pub(crate) mod artist_image_queue;
pub mod auth;
pub mod correction;
pub mod credit_role;
pub mod enum_table;
pub mod event;
pub(crate) mod image_queue;
pub mod label;
pub mod release;
pub mod release_image;
pub(crate) mod release_image_queue;
pub mod search;
pub mod song;
pub mod song_lyrics;
pub mod tag;
mod tag_vote;
pub mod user;
pub mod user_image;
pub mod user_profile;

use utoipa_axum::router::OpenApiRouter;

use crate::adapter::inbound::rest::state::ArcAppState;

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .merge(admin::router())
        .merge(artist::router())
        .merge(correction::router())
        .merge(credit_role::router())
        .merge(enum_table::router())
        .merge(event::router())
        .merge(image_queue::router())
        .merge(label::router())
        .merge(release::router())
        .merge(search::router())
        .merge(song::router())
        .merge(song_lyrics::router())
        .merge(tag::router())
        .merge(tag_vote::router())
        .merge(user::router())
        .merge(user_profile::router())
}
