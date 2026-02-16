use std::fmt::Display;

use garde::Validate;

use super::error::InvalidEmail;

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub(crate) struct Email(String);

impl Display for Email {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}

impl Email {
    pub(crate) fn parse(input: &str) -> Result<Self, InvalidEmail> {
        #[derive(Validate)]
        struct EmailValidation<'a> {
            #[garde(email)]
            email: &'a str,
        }

        // lowercase to normalize email
        let email = input.to_lowercase();

        EmailValidation { email: &email }
            .validate()
            .map_err(|e| InvalidEmail::new(input.to_string(), e))?;

        Ok(Self(email))
    }

    pub(crate) fn as_str(&self) -> &str {
        &self.0
    }
}
