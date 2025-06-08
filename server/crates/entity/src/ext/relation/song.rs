use sea_orm::{Related, RelationTrait};

use crate::entities::*;

impl Related<release::Entity> for song::Entity {
    fn to() -> sea_orm::RelationDef {
        release_track::Relation::Release.def()
    }

    fn via() -> Option<sea_orm::RelationDef> {
        Some(release_track::Relation::Song.def().rev())
    }
}
