use crate::error::SongServiceError;
use crate::model::input::{
    CreateSongInput, RandomSongInput, RetrieveSongInput,
};
use crate::service::juniper::JuniperContext;
use entity::song;
use juniper::{FieldError, FieldResult, GraphQLObject};
use serde::Deserialize;
use std::str::FromStr;

pub struct SongQuery;

pub struct SongMutation;

#[juniper::graphql_object]
#[graphql(context = JuniperContext)]
impl SongQuery {
    #[graphql(description = "Get a song by its id.")]
    async fn retrieve(
        input: RetrieveSongInput,
        context: &JuniperContext,
    ) -> FieldResult<Option<song::Model>> {
        let song_service = &context.song_service;
        let song = song_service.find_by_id(input.id).await?;
        Ok(song)
    }
}

#[juniper::graphql_object]
#[graphql(context = JuniperContext)]
impl SongMutation {
    #[graphql(description = "Create a new song.")]
    async fn create(
        input: CreateSongInput,
        context: &JuniperContext,
    ) -> FieldResult<song::Model> {
        let song_service = &context.song_service;

        let parsed_duration =
            iso8601_duration::Duration::from_str(&input.duration)
                .map(|d| d.to_chrono())
                .map_err(|e| {
                    tracing::error!("{:#?}", e);
                    SongServiceError::InvalidField {
                        field: "duration".to_string(),
                        expected: "ISO8601 duration".to_string(),
                        accepted: e.input,
                    }
                })?;

        let new_song = song_service
            .create()
            .title(input.title)
            .maybe_duration(parsed_duration)
            .call()
            .await?;

        Ok(new_song)
    }
}
