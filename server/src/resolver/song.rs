use std::str::FromStr;

use entity::{GqlScalarValue, song};
use juniper::FieldResult;

use crate::dto::correction::Metadata;
use crate::dto::song::NewSong;
use crate::error::InvalidField;
use crate::model::input::{CreateSongInput, RetrieveSongInput};
use crate::service::juniper::JuniperContext;

pub struct SongQuery;

pub struct SongMutation;

#[juniper::graphql_object]
#[graphql(context = JuniperContext, scalar = GqlScalarValue)]
impl SongQuery {
    async fn retrieve(
        input: RetrieveSongInput,
        context: &JuniperContext,
    ) -> FieldResult<Option<song::Model>> {
        let song = context.state.song_service.find_by_id(input.id).await?;
        Ok(song)
    }
}

#[allow(unused_variables, unreachable_code)]
#[juniper::graphql_object]
#[graphql(context = JuniperContext, scalar = GqlScalarValue)]
impl SongMutation {
    #[graphql(description = "Create a new song.")]
    async fn create(
        input: CreateSongInput,
        context: &JuniperContext,
    ) -> FieldResult<song::Model> {
        todo!();
        let parsed_duration =
            iso8601_duration::Duration::from_str(&input.duration)
                .map(|d| d.to_chrono())
                .map_err(|e| {
                    tracing::error!("{:#?}", e);
                    InvalidField {
                        field: "duration".to_string(),
                        expected: "ISO8601 duration".to_string(),
                        accepted: e.input,
                    }
                })?;
        let new_song = context
            .state
            .song_service
            .create(NewSong {
                title: input.title,
                languages: None,
                localized_titles: None,
                credits: None,
                metadata: Metadata {
                    author_id: todo!(),
                    description: todo!(),
                },
            })
            .await?;

        Ok(new_song)
    }
}
