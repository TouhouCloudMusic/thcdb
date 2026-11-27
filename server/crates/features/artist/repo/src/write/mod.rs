mod model;

use chrono::NaiveDate;
use domain::shared::{
    DateWithPrecision, EntityIdent, HttpUrl, Location, NewLocalizedName,
};
use entity::enums::{ArtistType, DatePrecision};
use entity::{
    artist_alias, artist_alias_history, artist_link, artist_link_history,
    artist_localized_name, artist_localized_name_history, artist_membership,
    artist_membership_history, artist_membership_role,
    artist_membership_role_history, artist_membership_tenure,
    artist_membership_tenure_history,
};
use futures_util::try_join;
use infra_db::DatabaseTransaction;
use infra_db::error::DatabaseError;
use itertools::Itertools;
pub use model::{NewArtist, NewMembership, Tenure, ValidationError};
use sea_orm::ActiveValue::{
    NotSet, Set, {self},
};
use sea_orm::{
    ActiveModelTrait, ConnectionTrait, DbErr, EntityTrait, TryInsertResult,
};
use sea_query::OnConflict;

async fn create_artist(
    data: &NewArtist,
    conn: &DatabaseTransaction,
) -> Result<entity::artist::Model, DbErr> {
    infra_db::trace("artist.insert_with_relations", async {
        let (start_date, start_date_precision) =
            conv_date_with_prec(data.start_date);
        let (end_date, end_date_precision) = conv_date_with_prec(data.end_date);

        let text_alias = conv_text_aliases(data.text_aliases.clone());

        let (
            start_location_country,
            start_location_province,
            start_location_city,
        ) = conv_location(data.start_location.clone());
        let (
            current_location_country,
            current_location_province,
            current_location_city,
        ) = conv_location(data.current_location.clone());

        let artist_model = entity::artist::ActiveModel {
            id: NotSet,
            name: Set(data.name.to_string()),
            artist_type: Set(data.artist_type),
            text_alias,
            start_date,
            start_date_precision,
            end_date,
            end_date_precision,
            start_location_country,
            start_location_province,
            start_location_city,
            current_location_country,
            current_location_province,
            current_location_city,
        };

        let artist = artist_model.insert(conn).await?;

        try_join!(
            create_artist_alias(artist.id, data.aliases.as_deref(), conn),
            create_artist_link(artist.id, data.links.as_deref(), conn),
            create_artist_localized_name(
                artist.id,
                data.localized_names.as_deref(),
                conn
            ),
            create_artist_artist_membership(
                artist.id,
                data.artist_type,
                data.memberships.as_deref(),
                conn
            ),
        )?;

        Ok(artist)
    })
    .await
}

async fn create_artist_history(
    data: &NewArtist,
    conn: &DatabaseTransaction,
) -> Result<entity::artist_history::Model, DbErr> {
    infra_db::trace("artist.insert_history_with_relations", async {
        let (start_date, start_date_precision) =
            conv_date_with_prec(data.start_date);
        let (end_date, end_date_precision) = conv_date_with_prec(data.end_date);

        let text_alias = conv_text_aliases(data.text_aliases.clone());

        let (
            start_location_country,
            start_location_province,
            start_location_city,
        ) = conv_location(data.start_location.clone());
        let (
            current_location_country,
            current_location_province,
            current_location_city,
        ) = conv_location(data.current_location.clone());

        let artist_history_model = entity::artist_history::ActiveModel {
            id: NotSet,
            name: Set(data.name.to_string()),
            artist_type: Set(data.artist_type),
            text_alias,
            start_date,
            start_date_precision,
            end_date,
            end_date_precision,
            start_location_country,
            start_location_province,
            start_location_city,
            current_location_country,
            current_location_province,
            current_location_city,
        };

        let artist_history = artist_history_model.insert(conn).await?;

        try_join!(
            create_artist_alias_history(
                artist_history.id,
                data.aliases.as_deref(),
                conn
            ),
            create_artist_link_history(
                artist_history.id,
                data.links.as_deref(),
                conn
            ),
            create_artist_localized_name_history(
                artist_history.id,
                data.localized_names.as_deref(),
                conn
            ),
            create_artist_artist_membership_history(
                artist_history.id,
                data.memberships.as_deref(),
                conn
            ),
        )?;

        Ok(artist_history)
    })
    .await
}

async fn create_artist_alias(
    artist_id: i32,
    aliases: Option<&[i32]>,
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    if let Some(aliases) = aliases {
        let model = aliases.iter().map(|id| artist_alias::ActiveModel {
            first_id: Set(*id.min(&artist_id)),
            second_id: Set(*id.max(&artist_id)),
        });

        artist_alias::Entity::insert_many(model)
            .on_empty_do_nothing()
            .exec(db)
            .await?;
    }

    Ok(())
}

async fn create_artist_alias_history(
    history_id: i32,
    aliases: Option<&[i32]>,
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    if let Some(aliases) = aliases {
        let history_model =
            aliases.iter().map(|id| artist_alias_history::ActiveModel {
                history_id: Set(history_id),
                alias_id: Set(*id),
            });

        artist_alias_history::Entity::insert_many(history_model)
            .on_empty_do_nothing()
            .exec(db)
            .await?;
    }

    Ok(())
}

async fn create_artist_link(
    artist_id: i32,
    links: Option<&[HttpUrl]>,
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    if let Some(links) = links {
        let model = links.iter().map(|url| artist_link::ActiveModel {
            id: NotSet,
            artist_id: Set(artist_id),
            url: Set(url.to_string()),
        });

        artist_link::Entity::insert_many(model)
            .on_conflict(
                OnConflict::columns([
                    artist_link::Column::ArtistId,
                    artist_link::Column::Url,
                ])
                .do_nothing()
                .to_owned(),
            )
            .on_empty_do_nothing()
            .exec_without_returning(db)
            .await?;
    }

    Ok(())
}

async fn create_artist_link_history(
    history_id: i32,
    links: Option<&[HttpUrl]>,
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    if let Some(links) = links {
        let model = links.iter().map(|url| artist_link_history::ActiveModel {
            id: NotSet,
            history_id: Set(history_id),
            url: Set(url.to_string()),
        });

        artist_link_history::Entity::insert_many(model)
            .on_conflict(
                OnConflict::columns([
                    artist_link_history::Column::HistoryId,
                    artist_link_history::Column::Url,
                ])
                .do_nothing()
                .to_owned(),
            )
            .on_empty_do_nothing()
            .exec_without_returning(db)
            .await?;
    }

    Ok(())
}

async fn create_artist_localized_name(
    artist_id: i32,
    localized_names: Option<&[NewLocalizedName]>,
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    if let Some(localized_names) = localized_names {
        let model = localized_names.iter().map(|x| {
            artist_localized_name::ActiveModel {
                id: NotSet,
                artist_id: Set(artist_id),
                language_id: Set(x.language_id),
                name: Set(x.name.clone()),
            }
        });

        artist_localized_name::Entity::insert_many(model)
            .on_empty_do_nothing()
            .exec(db)
            .await?;
    }

    Ok(())
}

async fn create_artist_localized_name_history(
    history_id: i32,
    localized_names: Option<&[NewLocalizedName]>,
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    if let Some(localized_names) = localized_names {
        let model = localized_names.iter().map(|x| {
            artist_localized_name_history::ActiveModel {
                id: NotSet,
                history_id: Set(history_id),
                language_id: Set(x.language_id),
                name: Set(x.name.clone()),
            }
        });
        artist_localized_name_history::Entity::insert_many(model)
            .on_empty_do_nothing()
            .exec(db)
            .await?;
    }

    Ok(())
}

async fn create_artist_artist_membership(
    artist_id: i32,
    artist_type: ArtistType,
    members: Option<&[NewMembership]>,
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    infra_db::trace("artist.create_memberships", async {
        if let Some(members) = members {
            let membership_models = members
                .iter()
                .map(|member| {
                    let (group_id, member_id) = if artist_type.is_solo() {
                        (Set(member.artist_id), Set(artist_id))
                    } else {
                        (Set(artist_id), Set(member.artist_id))
                    };

                    artist_membership::ActiveModel {
                        id: NotSet,
                        member_id,
                        group_id,
                    }
                })
                .collect_vec();

            let TryInsertResult::Inserted(new_artist_memberships) =
                artist_membership::Entity::insert_many(membership_models)
                    .on_empty_do_nothing()
                    .exec_with_returning_many(db)
                    .await?
            else {
                return Ok(());
            };

            let role_models = new_artist_memberships
                .iter()
                .zip(members.iter())
                .flat_map(|(artist_membership, member)| {
                    member.roles.iter().map(|role_id| {
                        artist_membership_role::ActiveModel {
                            membership_id: Set(artist_membership.id),
                            role_id: Set(*role_id),
                        }
                    })
                })
                .collect_vec();

            let tenure_models = new_artist_memberships
                .iter()
                .zip(members.iter())
                .flat_map(|(artist_membership, member)| {
                    member.tenure.iter().map(|tenure| {
                        artist_membership_tenure::ActiveModel {
                            id: NotSet,
                            membership_id: Set(artist_membership.id),
                            join_year: Set(tenure.join_year),
                            leave_year: Set(tenure.leave_year),
                        }
                    })
                })
                .collect_vec();

            // TODO: Remove this guard after upgrading to SeaORM 2.0 (sea-orm#2628).
            if !role_models.is_empty() {
                artist_membership_role::Entity::insert_many(role_models)
                    .exec(db)
                    .await?;
            }

            // TODO: Remove this guard after upgrading to SeaORM 2.0 (sea-orm#2628).
            if !tenure_models.is_empty() {
                artist_membership_tenure::Entity::insert_many(tenure_models)
                    .exec(db)
                    .await?;
            }
        }

        Ok(())
    })
    .await
}

async fn create_artist_artist_membership_history(
    history_id: i32,
    members: Option<&[NewMembership]>,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    infra_db::trace("artist.create_memberships_history", async {
        if let Some(members) = members {
            // TODO: Remove this guard after upgrading to SeaORM 2.0 (sea-orm#2628).
            if members.is_empty() {
                return Ok(());
            }

            let membership_history_models = members
                .iter()
                .map(|member| artist_membership_history::ActiveModel {
                    id: NotSet,
                    history_id: Set(history_id),
                    artist_id: Set(member.artist_id),
                })
                .collect_vec();

            let new_artist_memberships =
                artist_membership_history::Entity::insert_many(
                    membership_history_models,
                )
                .exec_with_returning_many(db)
                .await?;

            let role_models = new_artist_memberships
                .iter()
                .zip(members.iter())
                .flat_map(|(artist_membership_history, member)| {
                    member.roles.iter().map(|role_id| {
                        artist_membership_role_history::ActiveModel {
                            membership_history_id: Set(
                                artist_membership_history.id,
                            ),
                            role_id: Set(*role_id),
                        }
                    })
                })
                .collect_vec();

            let tenure_models = new_artist_memberships
                .iter()
                .zip(members.iter())
                .flat_map(|(history, member)| {
                    member.tenure.iter().map(|tenure| {
                        artist_membership_tenure_history::ActiveModel {
                            id: NotSet,
                            membership_history_id: Set(history.id),
                            join_year: Set(tenure.join_year),
                            leave_year: Set(tenure.leave_year),
                        }
                    })
                })
                .collect_vec();

            artist_membership_role_history::Entity::insert_many(role_models)
                .on_empty_do_nothing()
                .exec(db)
                .await?;

            artist_membership_tenure_history::Entity::insert_many(
                tenure_models,
            )
            .on_empty_do_nothing()
            .exec(db)
            .await?;
        }

        Ok(())
    })
    .await
}

fn conv_date_with_prec(
    val: Option<DateWithPrecision>,
) -> (
    ActiveValue<Option<NaiveDate>>,
    ActiveValue<Option<DatePrecision>>,
) {
    val.map_or((NotSet, NotSet), |x| {
        let (a, b) = x.destruct();
        (Set(Some(a)), Set(Some(b)))
    })
}

#[expect(clippy::type_complexity)]
fn conv_location(
    val: Option<Location>,
) -> (
    ActiveValue<Option<String>>,
    ActiveValue<Option<String>>,
    ActiveValue<Option<String>>,
) {
    val.map_or((NotSet, NotSet, NotSet), |x| {
        (Set(x.country), Set(x.province), Set(x.city))
    })
}

fn conv_text_aliases(
    val: Option<Vec<EntityIdent>>,
) -> ActiveValue<Option<Vec<String>>> {
    val.map_or(NotSet, |vec| {
        Set(Some(vec.into_iter().map(String::from).collect_vec()))
    })
}

/// Inserts the current artist in the caller's transaction.
///
/// Validate `data` before calling this function.
#[infra_db::observe("artist.create")]
pub async fn create(
    tx: &DatabaseTransaction,
    data: &NewArtist,
) -> Result<i32, DatabaseError> {
    Ok(create_artist(data, tx).await?.id)
}

/// Inserts an artist snapshot in the caller's transaction.
///
/// Validate `data` before calling this function.
#[infra_db::observe("artist.create_history")]
pub async fn create_history(
    tx: &DatabaseTransaction,
    data: &NewArtist,
) -> Result<i32, DatabaseError> {
    Ok(create_artist_history(data, tx).await?.id)
}
