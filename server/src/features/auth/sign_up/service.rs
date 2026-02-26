use chrono::{Duration, Utc};
use lettre::message::Mailbox;
use sea_orm::ActiveValue::Set;
use sea_orm::{ActiveModelTrait, TransactionTrait};

use super::verification::{
    SendVerificationEmailError, build_verification_email_message,
    is_unverified_signup_expired, verify_secret,
};
use crate::domain::auth::{
    AuthCredential, HashedPassword, ResendVerificationEmailRequest,
    ResendVerificationEmailResponse, SignUpRequest, SignUpResponse,
    VERIFICATION_CODE_EXPIRES_MINUTES,
    VERIFICATION_CODE_RESEND_COOLDOWN_SECONDS, VerifyEmailRequest,
    hash_password,
};
use crate::domain::model::VerificationCode;
use crate::domain::user::{NewUser, User};
use crate::features::auth::{
    Email, InvalidEmail, ResendVerificationEmailError, Service, SignUpError,
    VerifyEmailError, repo,
};
use crate::infra::error::Error;
use crate::shared::error::InvalidInput;

const VERIFICATION_CODE_MAX_FAILED_ATTEMPTS: i32 = 10;

impl Service {
    pub async fn sign_up(
        &self,
        SignUpRequest {
            username,
            email,
            password,
        }: SignUpRequest,
    ) -> Result<SignUpResponse, SignUpError> {
        let email = Email::parse(&email)
            .map_err(|source| SignUpError::InvalidEmail { source })?;

        let mut creds = AuthCredential::try_new(username, password)?;
        let username = creds.username.clone();
        let password_hash = creds.password_hash()?;

        if let Some(response) = self
            .resolve_signup_with_existing_email(
                &email,
                username.clone(),
                &password_hash,
            )
            .await?
        {
            return Ok(response);
        }

        self.ensure_signup_username_available(&username, None)
            .await?;

        let tx = self.repo.conn.begin().await?;
        let res = repo::create_user(
            &tx,
            NewUser {
                name: username.clone(),
                email: email.as_str().to_string(),
                email_verified: false,
                password: password_hash.as_str().to_string(),
            },
        )
        .await;

        match res {
            Ok(user) => {
                tx.commit().await?;
                self.create_and_send_email_verification(&user).await?;
                Ok(SignUpResponse::default())
            }
            Err(err) => {
                let _ = tx.rollback().await;
                match err {
                    sea_orm::DbErr::Query(sea_orm::RuntimeErr::SqlxError(
                        err,
                    )) if let Some(db_err) = err.as_database_error()
                        && db_err.constraint().is_some() =>
                    {
                        Err(SignUpError::UsernameAlreadyInUse { username })
                    }
                    err => Err(err.into()),
                }
            }
        }
    }

    pub async fn verify_email(
        &self,
        VerifyEmailRequest { email, code }: VerifyEmailRequest,
    ) -> Result<User, VerifyEmailError> {
        let email = Email::parse(&email)
            .map_err(|source| VerifyEmailError::InvalidEmail { source })?;

        let user = repo::find_by_email(&self.repo.conn, &email)
            .await?
            .filter(|u| !u.email_verified)
            .ok_or(VerifyEmailError::InvalidOrExpiredCode)?;

        if is_unverified_signup_expired(&user) {
            let tx = self.repo.conn.begin().await?;
            repo::delete_user(&tx, user.id).await?;
            tx.commit().await?;
            return Err(VerifyEmailError::InvalidOrExpiredCode);
        }

        let verification = user
            .email_verification
            .as_ref()
            .ok_or(VerifyEmailError::InvalidOrExpiredCode)?;

        if verification.failed_attempts >= VERIFICATION_CODE_MAX_FAILED_ATTEMPTS
        {
            return Err(VerifyEmailError::TooManyAttempts);
        }

        let now: chrono::DateTime<chrono::FixedOffset> = Utc::now().into();
        if now > verification.expires_at {
            return Err(VerifyEmailError::InvalidOrExpiredCode);
        }

        let ok = verify_secret(verification.hash.clone(), &code).await?;
        if !ok {
            repo::increment_email_verification_failed_attempts(
                &self.repo.conn,
                user.id,
            )
            .await?;
            return Err(VerifyEmailError::InvalidOrExpiredCode);
        }

        let tx = self.repo.conn.begin().await?;
        let user = repo::set_email_verified(&tx, user.id).await?;
        tx.commit().await?;

        Ok(user)
    }

    pub async fn resend_verification_email(
        &self,
        ResendVerificationEmailRequest { email }: ResendVerificationEmailRequest,
    ) -> Result<ResendVerificationEmailResponse, ResendVerificationEmailError>
    {
        let email = Email::parse(&email).map_err(|source| {
            ResendVerificationEmailError::InvalidEmail { source }
        })?;

        let Some(user) = repo::find_by_email(&self.repo.conn, &email)
            .await?
            .filter(|u| !u.email_verified)
        else {
            return Ok(ResendVerificationEmailResponse::default());
        };

        if is_unverified_signup_expired(&user) {
            let tx = self.repo.conn.begin().await?;
            repo::delete_user(&tx, user.id).await?;
            tx.commit().await?;

            return Ok(ResendVerificationEmailResponse::default());
        }

        self.create_and_send_email_verification(&user).await?;

        Ok(ResendVerificationEmailResponse::default())
    }
}

impl Service {
    /// Return `None` means caller can continue the request
    async fn resolve_signup_with_existing_email(
        &self,
        email: &Email,
        username: String,
        password_hash: &HashedPassword<'_>,
    ) -> Result<Option<SignUpResponse>, SignUpError> {
        let Some(existing) =
            repo::find_by_email(&self.repo.conn, email).await?
        else {
            return Ok(None);
        };

        if existing.email_verified {
            // Return normal response if email is verified
            // This is very unlikely to happen.
            // TODO: maybe we should log here
            return Ok(Some(SignUpResponse::default()));
        }

        if is_unverified_signup_expired(&existing) {
            // Remove stale unverified signups (past TTL) so email/username can be reused.
            // Return `None` to let the caller continue handling the request
            let tx = self.repo.conn.begin().await?;
            repo::delete_user(&tx, existing.id).await?;
            tx.commit().await?;
            return Ok(None);
        }

        self.ensure_signup_username_available(&username, Some(existing.id))
            .await?;

        let _ = entity::user::ActiveModel {
            id: Set(existing.id),
            name: Set(username),
            password: Set(password_hash.as_str().to_string()),
            ..Default::default()
        }
        .update(&self.repo.conn)
        .await?;

        let user = repo::find_by_id(&self.repo.conn, existing.id)
            .await?
            .ok_or_else(|| {
                // unlikely
                Error::custom(&format!(
                    "User {} not found after update",
                    existing.id
                ))
            })?;

        self.create_and_send_email_verification(&user).await?;

        Ok(Some(SignUpResponse::default()))
    }

    async fn ensure_signup_username_available(
        &self,
        username: &str,
        allow_user_id: Option<i32>,
    ) -> Result<(), SignUpError> {
        let Some(existing) =
            repo::find_by_name(&self.repo.conn, username).await?
        else {
            return Ok(());
        };

        if allow_user_id.is_some_and(|id| id == existing.id) {
            return Ok(());
        }

        if existing.email_verified || !is_unverified_signup_expired(&existing) {
            return Err(SignUpError::UsernameAlreadyInUse {
                username: username.to_string(),
            });
        }

        let tx = self.repo.conn.begin().await?;
        repo::delete_user(&tx, existing.id).await?;
        tx.commit().await?;

        Ok(())
    }
}

impl Service {
    async fn create_and_send_email_verification(
        &self,
        user: &User,
    ) -> Result<(), SendVerificationEmailError> {
        if let Some(verification) = user.email_verification.as_ref() {
            let now: chrono::DateTime<chrono::FixedOffset> = Utc::now().into();
            let cooldown =
                Duration::seconds(VERIFICATION_CODE_RESEND_COOLDOWN_SECONDS);
            if verification.in_resend_cooldown(now, cooldown) {
                return Ok(());
            }
        }

        let now = Utc::now();
        let sent_at = now.into();
        let expires_at =
            (now + Duration::minutes(VERIFICATION_CODE_EXPIRES_MINUTES)).into();

        let code = VerificationCode::<6>::new().to_string();
        let code_hash = hash_password(&code).map_err(Error::from)?;

        self.send_verification_email(&user.email, &code).await?;

        let _ = repo::set_email_verification(
            &self.repo.conn,
            user.id,
            code_hash,
            expires_at,
            sent_at,
        )
        .await
        .map_err(Error::from)?;

        Ok(())
    }

    async fn send_verification_email(
        &self,
        to: &str,
        code: &str,
    ) -> Result<(), SendVerificationEmailError> {
        let from = self.mailer.from().clone();
        let to: Mailbox = match to.parse() {
            Ok(v) => v,
            Err(err) => {
                tracing::error!("Invalid to address {to}: {err}");
                return Err(SendVerificationEmailError::InvalidEmail(
                    InvalidEmail::new(
                        to,
                        InvalidInput::new(&format!(
                            "Invalid verification email recipient address: {to}"
                        )),
                    ),
                ));
            }
        };

        let message = build_verification_email_message(from, to, code)?;

        match self.mailer.send(message).await {
            Ok(()) => Ok(()),
            Err(err) => {
                tracing::error!("Failed to send verification email: {err}");
                Err(SendVerificationEmailError::Unavailable)
            }
        }
    }
}
