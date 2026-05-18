use entity::enums::{ArtistType, DatePrecision, ReleaseType, TagType};
use entity::{artist, release, song, tag, user, user_role};
use fake::{Dummy, Fake, Faker};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ConnectionTrait, DbErr, EntityTrait, IntoActiveModel};

use crate::features::auth::UserRoleEnum;

async fn insert_fixture<E, F>(
    conn: &impl ConnectionTrait,
    fixture: F,
) -> Result<E::Model, DbErr>
where
    E: EntityTrait,
    F: IntoActiveModel<E::ActiveModel>,
    E::Model: IntoActiveModel<E::ActiveModel>,
{
    E::insert(fixture.into_active_model())
        .exec_with_returning(conn)
        .await
}

#[derive(Clone, Debug, Dummy)]
pub struct MockUser {
    pub label: String,
    pub suffix: u64,
    pub password: String,
}

impl Default for MockUser {
    fn default() -> Self {
        Faker.fake()
    }
}

impl MockUser {
    pub fn with_label(label: impl Into<String>) -> Self {
        Self {
            label: label.into(),
            ..Faker.fake()
        }
    }

    pub async fn insert(
        self,
        conn: &impl ConnectionTrait,
    ) -> Result<user::Model, DbErr> {
        let user = insert_fixture::<user::Entity, _>(conn, self).await?;

        user_role::Entity::insert(user_role::ActiveModel {
            user_id: Set(user.id),
            role_id: Set(UserRoleEnum::User.into()),
        })
        .exec(conn)
        .await?;

        Ok(user)
    }
}

impl IntoActiveModel<user::ActiveModel> for MockUser {
    fn into_active_model(self) -> user::ActiveModel {
        let name = format!("{}_{}", self.label, self.suffix);
        let email = format!("{name}@example.com");

        user::ActiveModel {
            id: NotSet,
            name: Set(name),
            email: Set(email),
            email_verified: Set(true),
            password: Set(self.password),
            avatar_id: Set(None),
            last_login: NotSet,
            created_at: NotSet,
            profile_banner_id: Set(None),
            bio: Set(None),
            settings: Set(serde_json::json!({})),
        }
    }
}

#[derive(Clone, Debug, Dummy)]
pub struct MockSong {
    pub title: String,
}

impl Default for MockSong {
    fn default() -> Self {
        Faker.fake()
    }
}

impl MockSong {
    pub fn titled(title: impl Into<String>) -> Self {
        Self {
            title: title.into(),
        }
    }

    pub async fn insert(
        self,
        conn: &impl ConnectionTrait,
    ) -> Result<song::Model, DbErr> {
        insert_fixture::<song::Entity, _>(conn, self).await
    }
}

impl IntoActiveModel<song::ActiveModel> for MockSong {
    fn into_active_model(self) -> song::ActiveModel {
        song::ActiveModel {
            id: NotSet,
            title: Set(self.title),
        }
    }
}

#[derive(Clone, Debug, Dummy)]
pub struct MockArtist {
    pub name: String,
}

impl Default for MockArtist {
    fn default() -> Self {
        Faker.fake()
    }
}

impl MockArtist {
    pub fn named(name: impl Into<String>) -> Self {
        Self { name: name.into() }
    }

    pub async fn insert(
        self,
        conn: &impl ConnectionTrait,
    ) -> Result<artist::Model, DbErr> {
        insert_fixture::<artist::Entity, _>(conn, self).await
    }
}

impl IntoActiveModel<artist::ActiveModel> for MockArtist {
    fn into_active_model(self) -> artist::ActiveModel {
        artist::ActiveModel {
            id: NotSet,
            name: Set(self.name),
            artist_type: Set(ArtistType::Solo),
            text_alias: Set(None),
            start_date: Set(None),
            start_date_precision: Set(None),
            end_date: Set(None),
            end_date_precision: Set(None),
            current_location_country: Set(None),
            current_location_province: Set(None),
            current_location_city: Set(None),
            start_location_country: Set(None),
            start_location_province: Set(None),
            start_location_city: Set(None),
        }
    }
}

#[derive(Clone, Debug, Dummy)]
pub struct MockRelease {
    pub title: String,
}

impl Default for MockRelease {
    fn default() -> Self {
        Faker.fake()
    }
}

impl MockRelease {
    pub fn titled(title: impl Into<String>) -> Self {
        Self {
            title: title.into(),
        }
    }

    pub async fn insert(
        self,
        conn: &impl ConnectionTrait,
    ) -> Result<release::Model, DbErr> {
        insert_fixture::<release::Entity, _>(conn, self).await
    }
}

impl IntoActiveModel<release::ActiveModel> for MockRelease {
    fn into_active_model(self) -> release::ActiveModel {
        release::ActiveModel {
            id: NotSet,
            title: Set(self.title),
            release_type: Set(ReleaseType::Album),
            release_date: Set(None),
            release_date_precision: Set(DatePrecision::Day),
            recording_date_start: Set(None),
            recording_date_start_precision: Set(DatePrecision::Day),
            recording_date_end: Set(None),
            recording_date_end_precision: Set(DatePrecision::Day),
        }
    }
}

#[derive(Clone, Debug, Dummy)]
pub struct MockTag {
    pub name: String,
    pub short_description: String,
    pub description: String,
}

impl Default for MockTag {
    fn default() -> Self {
        Faker.fake()
    }
}

impl MockTag {
    pub fn named(name: impl Into<String>) -> Self {
        let name = name.into();
        Self {
            short_description: format!("{name} short"),
            description: format!("{name} description"),
            name,
        }
    }

    pub async fn insert(
        self,
        conn: &impl ConnectionTrait,
    ) -> Result<tag::Model, DbErr> {
        insert_fixture::<tag::Entity, _>(conn, self).await
    }
}

impl IntoActiveModel<tag::ActiveModel> for MockTag {
    fn into_active_model(self) -> tag::ActiveModel {
        tag::ActiveModel {
            id: NotSet,
            name: Set(self.name),
            r#type: Set(TagType::Genre),
            short_description: Set(self.short_description),
            description: Set(self.description),
        }
    }
}
