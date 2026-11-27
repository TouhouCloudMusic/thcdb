use bytes::Bytes;

use crate::features::image_queue::description::SubmissionDescription;
use crate::features::user::User;

pub struct ReleaseCoverArtInput {
    pub bytes: Bytes,
    pub user: User,
    pub release_id: i32,
    pub(crate) description: SubmissionDescription,
}
