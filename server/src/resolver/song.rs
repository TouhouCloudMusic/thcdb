use std::str::FromStr;

use entity::{song, GqlScalarValue};
use juniper::FieldResult;
use sea_orm::TransactionTrait;

use crate::error::SongServiceError;
use crate::model::change_request::BasicMetadata;
use crate::model::input::{CreateSongInput, RetrieveSongInput};
use crate::model::song::NewSong;
use crate::service;
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
        let song =
            service::song::find_by_id(input.id, &context.database).await?;
        Ok(song)
    }
}

#[juniper::graphql_object]
#[graphql(context = JuniperContext, scalar = GqlScalarValue)]
impl SongMutation {
    #[graphql(description = "Create a new song.")]
    async fn create(
        input: CreateSongInput,
        context: &JuniperContext,
    ) -> FieldResult<song::Model> {
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
        let transaction = context.database.begin().await?;
        let new_song = service::song::create(
            NewSong {
                title: input.title,
                duration: parsed_duration,
                languages: None,
                localized_titles: None,
                credits: None,
                metadata: BasicMetadata {
                    author_id: todo!(),
                    description: todo!(),
                },
            },
            &transaction,
        )
        .await?;
        transaction.commit().await?;

        Ok(new_song)
    }
}
