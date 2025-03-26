use sea_orm::ActiveValue::Set;
use sea_orm::NotSet;

impl From<crate::domain::entity::image::NewImage>
    for entity::image::ActiveModel
{
    fn from(val: crate::domain::entity::image::NewImage) -> Self {
        Self {
            id: NotSet,
            filename: Set(val.filename),
            uploaded_by: Set(val.uploaded_by),
            directory: Set(val.directory),
            created_at: NotSet,
        }
    }
}
