use std::collections::HashMap;

use domain::shared::{Language, LocalizedTitle};
use tracing::warn;

pub struct LanguageReferences(HashMap<i32, Language>);

impl LanguageReferences {
    pub fn new(languages: impl IntoIterator<Item = Language>) -> Self {
        Self(
            languages
                .into_iter()
                .map(|language| (language.id, language))
                .collect(),
        )
    }

    pub fn language(&self, language_id: i32) -> Option<Language> {
        self.0.get(&language_id).cloned().or_else(|| {
            warn!(
                language_id,
                "discarding item with missing language reference"
            );
            None
        })
    }

    pub fn localized_title(
        &self,
        language_id: i32,
        title: String,
    ) -> Option<LocalizedTitle> {
        Some(LocalizedTitle {
            language: self.language(language_id)?,
            title,
        })
    }
}
