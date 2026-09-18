use chrono::NaiveDate;
use entity::release;
use sea_orm::ColumnTrait;
use sea_query::{SimpleExpr, all, any};
use serde::{Deserialize, Serialize};

use crate::model::ArtistCreditSort;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "stage", rename_all = "snake_case")]
pub enum CreditsCursor {
    Release {
        release_date: Option<NaiveDate>,
        title: String,
        id: i32,
    },
    Song {
        after: Option<SongPosition>,
    },
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct SongPosition {
    pub title: String,
    pub id: i32,
}

pub(crate) fn release_after_position(
    release_date: Option<NaiveDate>,
    title: &str,
    id: i32,
    sort: ArtistCreditSort,
) -> SimpleExpr {
    let date = release::Column::ReleaseDate;
    let key_after = any![
        release::Column::Title.gt(title.to_owned()),
        all![
            release::Column::Title.eq(title.to_owned()),
            release::Column::Id.gt(id),
        ],
    ];
    match release_date {
        Some(date_value) => {
            let date_after = match sort {
                ArtistCreditSort::Newest => {
                    any![date.lt(date_value), date.is_null()]
                }
                ArtistCreditSort::Oldest => {
                    any![date.gt(date_value), date.is_null()]
                }
            };
            let same_date = date.eq(date_value);
            any![date_after, all![same_date, key_after]].into()
        }
        None => all![date.is_null(), key_after].into(),
    }
}
