pub mod artist;
pub mod artist_image;
pub mod auth;
pub mod correction;
pub mod credit_role;
pub mod enum_table;
pub mod event;
pub mod label;
pub mod release;
pub mod release_image;
pub mod song;
pub mod song_lyrics;
pub mod tag;
mod tag_vote;
pub mod user;

use utoipa_axum::router::OpenApiRouter;

use crate::adapter::inbound::rest::state::ArcAppState;

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .merge(artist::router())
        .merge(correction::router())
        .merge(credit_role::router())
        .merge(enum_table::router())
        .merge(event::router())
        .merge(label::router())
        .merge(release::router())
        .merge(song::router())
        .merge(song_lyrics::router())
        .merge(tag::router())
        .merge(tag_vote::router())
        .merge(user::router())
}
