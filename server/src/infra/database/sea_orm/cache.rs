use std::collections::HashMap;
use std::sync::OnceLock;

use entity::language;
use sea_orm::{ConnectionTrait, DbErr, EntityTrait};

use crate::domain::shared::model::Language;

pub struct LanguageCache {
    inner: OnceLock<HashMap<i32, Language>>,
}

pub static LANGUAGE_CACHE: LanguageCache = LanguageCache::new();

impl LanguageCache {
    pub const fn new() -> Self {
        Self {
            inner: OnceLock::new(),
        }
    }

    pub async fn get_or_init(
        &self,
        conn: &impl ConnectionTrait,
    ) -> Result<&HashMap<i32, Language>, DbErr> {
        if let Some(langs) = self.inner.get() {
            Ok(langs)
        } else {
            let langs = language::Entity::find().all(conn).await?;
            let langs = langs
                .into_iter()
                .map(|l| {
                    (
                        l.id,
                        Language {
                            id: l.id,
                            name: l.name,
                            code: l.code,
                        },
                    )
                })
                .collect();
            self.inner.set(langs).unwrap();
            Ok(self.inner.get().unwrap())
        }
    }
}
