use crate::model::input::{
    CreateSongInput, RandomSongInput, RetrieveSongInput,
};
use crate::service::juniper::JuniperContext;
use entity::song;
use juniper::{FieldError, FieldResult};

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

    #[graphql(description = "Get random songs.")]
    async fn random(
        input: RandomSongInput,
        context: &JuniperContext,
    ) -> FieldResult<Vec<song::Model>> {
        let song_service = &context.song_service;
        let song = song_service.random(input.count as u64).await?;

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
        let new_song = song_service
            .create(
                input.title,
                input.created_at,
                input.updated_at,
            )
            .await?;

        Ok(new_song)
    }
}
