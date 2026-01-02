use bytes::Bytes;

use crate::domain::user::User;

pub struct ReleaseCoverArtInput {
    pub bytes: Bytes,
    pub user: User,
    pub release_id: i32,
}
