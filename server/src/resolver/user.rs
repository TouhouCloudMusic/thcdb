use juniper::{graphql_object, graphql_value, FieldError, FieldResult};

use crate::model::output::*;
use crate::model::user::{SignIn, SignUp};
use crate::service::juniper::*;

pub struct UserQuery;
pub struct UserMutation;

#[graphql_object]
#[graphql(context = JuniperContext)]
impl UserQuery {
    #[graphql(description = "Use username and password to login.")]
    async fn sign_in(
        input: SignIn,
        context: &JuniperContext,
    ) -> FieldResult<LoginOutput> {
        let user_service = &context.user_service;
        let verification_result = user_service
            .verify_credentials(&input.username, &input.password)
            .await?;

        Ok(LoginOutput {
            message: format!("Hello {}!", verification_result.name),
        })
    }
}
#[graphql_object]
#[graphql(context = JuniperContext)]
impl UserMutation {
    #[graphql(description = "Register a new user.")]
    async fn sign_up(
        input: SignUp,
        context: &JuniperContext,
    ) -> FieldResult<SignupOutput> {
        let user_service = &context.user_service;

        if user_service.is_exist(&input.username).await? {
            return Err(FieldError::new(
                "User already exits",
                graphql_value!({"status": "USER_EXISTS"}),
            ));
        }

        let user = user_service
            .create(&input.username, &input.password)
            .await
            .map_err(|err| {
                FieldError::new(
                    format!("Failed to create user: {}", err),
                    graphql_value!({"status": "DATABASE_ERROR"}),
                )
            })?;

        Ok(SignupOutput { id: user.id })
    }
}
