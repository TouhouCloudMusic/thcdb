use juniper::{FieldResult, graphql_object};

use crate::model::auth::AuthCredential;
use crate::model::output::{LoginOutput, SignupOutput};
use crate::service::juniper::JuniperContext;

pub struct UserQuery;
pub struct UserMutation;

#[graphql_object]
#[graphql(context = JuniperContext)]
impl UserQuery {
    #[graphql(description = "Use username and password to login.")]
    async fn sign_in(
        input: AuthCredential,
        context: &JuniperContext,
    ) -> FieldResult<LoginOutput> {
        todo!()
        // let user_service = &context.state.user_service;
        // let verification_result = user_service
        //     .verify_credentials(&input.username, &input.password)
        //     .await?;

        // Ok(LoginOutput {
        //     message: format!("Hello {}!", verification_result.name),
        // })
    }
}
#[graphql_object]
#[graphql(context = JuniperContext)]
impl UserMutation {
    #[graphql(description = "Register a new user.")]
    async fn sign_up(
        input: AuthCredential,
        context: &JuniperContext,
    ) -> FieldResult<SignupOutput> {
        todo!()
        // let user_service = &context.state.user_service;

        // if user_service.is_use(&input.username).await? {
        //     return Err(FieldError::new(
        //         "User already exits",
        //         graphql_value!({"status": "USER_EXISTS"}),
        //     ));
        // }

        // let user = user_service
        //     .create()
        //     .await
        //     .map_err(|err| {
        //         FieldError::new(
        //             format!("Failed to create user: {err}"),
        //             graphql_value!({"status": "DATABASE_ERROR"}),
        //         )
        //     })?;

        // Ok(SignupOutput { id: user.id })
    }
}
