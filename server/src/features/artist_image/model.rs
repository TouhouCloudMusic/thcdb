use bytes::Bytes;

use crate::domain::user::User;

pub struct ArtistProfileImageInput {
    pub bytes: Bytes,
    #[doc(alias = "uploaded_by")]
    pub user: User,
    pub artist_id: i32,
}
