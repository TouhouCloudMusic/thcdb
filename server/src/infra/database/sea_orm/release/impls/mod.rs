use entity::release;
use sea_orm::{ConnectionTrait, DbErr};

use self::conv::conv_to_domain_model;
use self::loader::RelatedEntities;
use crate::domain::release::Release;

mod artist;
mod catalog_number;
mod conv;
mod credit;
mod disc;
mod event;
mod loader;
mod localized_title;
mod track;
pub(super) use artist::*;
pub(super) use catalog_number::*;
pub(super) use credit::*;
pub(super) use disc::*;
pub(super) use event::*;
pub(super) use localized_title::*;
pub(super) use track::*;

pub async fn find_many_impl(
    select: sea_orm::Select<release::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<Release>, DbErr> {
    let releases = select.all(db).await?;
    let related = RelatedEntities::load(&releases, db).await?;

    let result = releases
        .into_iter()
        .enumerate()
        .map(|(i, release)| conv_to_domain_model(&release, &related, i))
        .collect();

    Ok(result)
}
