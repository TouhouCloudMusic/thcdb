use std::fmt::Display;

use garde::Validate;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(try_from = "String")]
pub struct Email(String);

impl Email {
    pub fn parse(input: &str) -> Result<Self, InvalidEmail> {
        #[derive(Validate)]
        struct EmailValidation<'a> {
            #[garde(email)]
            email: &'a str,
        }

        let email = input.to_lowercase();

        EmailValidation { email: &email }
            .validate()
            .map_err(|err| InvalidEmail::new(input, err))?;

        Ok(Self(email))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl TryFrom<String> for Email {
    type Error = InvalidEmail;

    fn try_from(input: String) -> Result<Self, Self::Error> {
        Self::parse(&input)
    }
}

#[derive(Debug, derive_more::Display, derive_more::Error)]
#[display("Invalid email: {email}.\n{reason}")]
pub struct InvalidEmail {
    email: String,
    reason: String,
}

impl InvalidEmail {
    pub fn new(email: impl Into<String>, reason: impl Display) -> Self {
        Self {
            email: email.into(),
            reason: reason.to_string(),
        }
    }
}
