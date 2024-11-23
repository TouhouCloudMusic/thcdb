use juniper::GraphQLInputObject;

#[derive(GraphQLInputObject)]
pub struct RetrieveSongInput {
    pub id: i32,
}

#[derive(GraphQLInputObject)]
pub struct RandomSongInput {
    #[graphql(description = "The number of random songs to return.")]
    pub count: i32,
}

#[derive(GraphQLInputObject)]
pub struct CreateSongInput {
    pub title: String,
    #[graphql(description = "ISO 8601 format")]
    pub duration: String,
}

#[derive(GraphQLInputObject)]
pub struct RetrieveReleaseInput {
    pub id: i32,
}
