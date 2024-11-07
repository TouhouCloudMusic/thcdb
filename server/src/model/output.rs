use juniper::GraphQLObject;

#[derive(GraphQLObject)]
pub struct SignupOutput {
    pub id: i32,
}

#[derive(GraphQLObject)]
pub struct LoginOutput {
    pub message: String,
}
