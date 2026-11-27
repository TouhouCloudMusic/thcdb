use bytes::Bytes;

use crate::features::image_queue::description::SubmissionDescription;
use crate::features::user::User;

pub struct ArtistProfileImageInput {
    pub bytes: Bytes,
    #[doc(alias = "uploaded_by")]
    pub user: User,
    pub artist_id: i32,
    pub(crate) description: SubmissionDescription,
}
