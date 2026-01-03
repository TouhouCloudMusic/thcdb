use entity::correction as correction_entity;

use crate::domain::correction::Correction;

impl From<correction_entity::Model> for Correction {
    fn from(model: correction_entity::Model) -> Self {
        Self {
            id: model.id,
            status: model.status,
            r#type: model.r#type,
            entity_id: model.entity_id,
            entity_type: model.entity_type,
            created_at: model.created_at,
            handled_at: model.handled_at,
        }
    }
}
