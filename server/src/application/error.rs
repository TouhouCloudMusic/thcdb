use std::panic::Location;

#[derive(Debug, derive_more::Display, derive_more::Error)]
#[display("{entity_type} #{entity_id} not found")]
pub struct EntityNotFound {
    pub entity_id: i32,
    pub entity_type: &'static str,
    location: &'static Location<'static>,
}

impl EntityNotFound {
    #[track_caller]
    pub const fn new(entity_id: i32, entity_type: &'static str) -> Self {
        Self {
            entity_id,
            entity_type,
            location: Location::caller(),
        }
    }
}
