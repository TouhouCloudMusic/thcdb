use chrono::NaiveDate;
use domain::shared::{
    DateWithPrecision, EntityIdent, Location, NewLocalizedName,
};
use entity::enums::{ArtistType, DatePrecision};
use entity::{
    artist_alias, artist_alias_history, artist_history, artist_link,
    artist_link_history, artist_localized_name, artist_localized_name_history,
    artist_membership, artist_membership_history, artist_membership_role,
    artist_membership_role_history, artist_membership_tenure,
    artist_membership_tenure_history, correction_revision,
};
use futures_util::try_join;
use infra_db::SeaOrmTxRepo;
use itertools::Itertools;
use sea_orm::ActiveValue::{
    NotSet, Set, {self},
};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseTransaction, DbErr,
    EntityTrait, LoaderTrait, QueryFilter, QueryOrder, TryInsertResult,
};
use sea_query::any;
use url::Url;

use crate::features::artist::model::{NewArtist, NewMembership};
use crate::infra::database::error::{
    BrokenEntityReference, DatabaseError, DatabaseResultExt,
};

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewArtist,
) -> Result<i32, DatabaseError> {
    create_artist(data, repo.conn())
        .await
        .map(|artist| artist.id)
        .db_operation("create artist")
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewArtist,
) -> Result<i32, DatabaseError> {
    create_artist_history(data, repo.conn())
        .await
        .map(|artist| artist.id)
        .db_operation("create artist history")
}

async fn create_artist(
    data: &NewArtist,
    conn: &sea_orm::DatabaseTransaction,
) -> Result<entity::artist::Model, DbErr> {
    let (start_date, start_date_precision) =
        conv_date_with_prec(data.start_date);
    let (end_date, end_date_precision) = conv_date_with_prec(data.end_date);

    let text_alias = conv_text_aliases(data.text_aliases.clone());

    let (start_location_country, start_location_province, start_location_city) =
        conv_location(data.start_location.clone());
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
}

async fn create_artist_history(
    data: &NewArtist,
    conn: &sea_orm::DatabaseTransaction,
) -> Result<entity::artist_history::Model, DbErr> {
    let (start_date, start_date_precision) =
        conv_date_with_prec(data.start_date);
    let (end_date, end_date_precision) = conv_date_with_prec(data.end_date);

    let text_alias = conv_text_aliases(data.text_aliases.clone());

    let (start_location_country, start_location_province, start_location_city) =
        conv_location(data.start_location.clone());
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
}

pub(crate) async fn apply_update(
    correction: entity::correction::Model,
    db: &DatabaseTransaction,
) -> Result<(), DatabaseError> {
    let revision = correction_revision::Entity::find()
        .filter(correction_revision::Column::CorrectionId.eq(correction.id))
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(db)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "correction revision",
            id: correction.id,
        })?;

    let history =
        artist_history::Entity::find_by_id(revision.entity_history_id)
            .one(db)
            .await?
            .ok_or(BrokenEntityReference {
                entity: "artist history",
                id: revision.entity_history_id,
            })?;

    entity::artist::ActiveModel {
        id: Set(correction.entity_id),
        name: Set(history.name),
        artist_type: Set(history.artist_type),
        text_alias: Set(history.text_alias),
        start_date: Set(history.start_date),
        start_date_precision: Set(history.start_date_precision),
        end_date: Set(history.end_date),
        end_date_precision: Set(history.end_date_precision),
        current_location_country: Set(history.current_location_country),
        current_location_province: Set(history.current_location_province),
        current_location_city: Set(history.current_location_city),
        start_location_country: Set(history.start_location_country),
        start_location_province: Set(history.start_location_province),
        start_location_city: Set(history.start_location_city),
    }
    .update(db)
    .await?;

    update_artist_aliases(correction.entity_id, revision.entity_history_id, db)
        .await?;
    update_artist_links(correction.entity_id, revision.entity_history_id, db)
        .await?;
    update_artist_localized_names(
        correction.entity_id,
        revision.entity_history_id,
        db,
    )
    .await?;
    update_artist_artist_membership(
        correction.entity_id,
        revision.entity_history_id,
        history.artist_type,
        db,
    )
    .await?;

    Ok(())
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
    links: Option<&[Url]>,
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    if let Some(links) = links {
        let model = links.iter().map(|url| artist_link::ActiveModel {
            id: NotSet,
            artist_id: Set(artist_id),
            url: Set(url.to_string()),
        });

        artist_link::Entity::insert_many(model)
            .on_empty_do_nothing()
            .exec(db)
            .await?;
    }

    Ok(())
}

async fn create_artist_link_history(
    history_id: i32,
    links: Option<&[Url]>,
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    if let Some(links) = links {
        let model = links.iter().map(|url| artist_link_history::ActiveModel {
            id: NotSet,
            history_id: Set(history_id),
            url: Set(url.to_string()),
        });

        artist_link_history::Entity::insert_many(model)
            .on_empty_do_nothing()
            .exec(db)
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

        artist_membership_role::Entity::insert_many(role_models)
            .exec(db)
            .await?;

        artist_membership_tenure::Entity::insert_many(tenure_models)
            .exec(db)
            .await?;
    }

    Ok(())
}

async fn create_artist_artist_membership_history(
    history_id: i32,
    members: Option<&[NewMembership]>,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if let Some(members) = members {
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

        artist_membership_tenure_history::Entity::insert_many(tenure_models)
            .on_empty_do_nothing()
            .exec(db)
            .await?;
    }

    Ok(())
}

async fn update_artist_aliases(
    artist_id: i32,
    history_id: i32,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    artist_alias::Entity::delete_many()
        .filter(any![
            artist_alias::Column::FirstId.eq(artist_id),
            artist_alias::Column::SecondId.eq(artist_id),
        ])
        .exec(db)
        .await?;

    let aliases = artist_alias_history::Entity::find()
        .filter(artist_alias_history::Column::HistoryId.eq(history_id))
        .all(db)
        .await?;

    let models = aliases
        .into_iter()
        .map(|x| x.alias_id)
        .map(|alias_id| artist_alias::ActiveModel {
            first_id: Set(alias_id.min(artist_id)),
            second_id: Set(alias_id.max(artist_id)),
        })
        .collect_vec();

    artist_alias::Entity::insert_many(models).exec(db).await?;

    Ok(())
}

async fn update_artist_links(
    artist_id: i32,
    history_id: i32,
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    artist_link::Entity::delete_many()
        .filter(artist_link::Column::ArtistId.eq(artist_id))
        .exec(db)
        .await?;

    let links = artist_link_history::Entity::find()
        .filter(artist_link_history::Column::HistoryId.eq(history_id))
        .all(db)
        .await?;

    let model = links
        .into_iter()
        .map(|x| x.url)
        .map(|x| artist_link::ActiveModel {
            artist_id: Set(artist_id),
            id: NotSet,
            url: Set(x),
        })
        .collect::<Vec<_>>();

    artist_link::Entity::insert_many(model).exec(db).await?;

    Ok(())
}

async fn update_artist_localized_names(
    artist_id: i32,
    history_id: i32,
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    artist_localized_name::Entity::delete_many()
        .filter(artist_localized_name::Column::ArtistId.eq(artist_id))
        .exec(db)
        .await?;

    let localized_names = artist_localized_name_history::Entity::find()
        .filter(artist_localized_name_history::Column::HistoryId.eq(history_id))
        .all(db)
        .await?;

    let models = localized_names
        .into_iter()
        .map(|x| artist_localized_name::ActiveModel {
            id: NotSet,
            artist_id: Set(artist_id),
            language_id: Set(x.language_id),
            name: Set(x.name),
        })
        .collect::<Vec<_>>();

    artist_localized_name::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}

async fn update_artist_artist_membership(
    artist_id: i32,
    history_id: i32,
    artist_type: ArtistType,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    // artist_membership_role and artist_membership_tenure are deleted by database cascade
    artist_membership::Entity::delete_many()
        .filter(any![
            artist_membership::Column::MemberId.eq(artist_id),
            artist_membership::Column::GroupId.eq(artist_id),
        ])
        .exec(db)
        .await?;

    if artist_type == ArtistType::Unknown {
        return Ok(());
    }

    let artist_membership = artist_membership_history::Entity::find()
        .filter(artist_membership_history::Column::HistoryId.eq(history_id))
        .all(db)
        .await?;

    let artist_membership_role = artist_membership
        .load_many(artist_membership_role_history::Entity, db)
        .await?;

    let artist_membership_tenure = artist_membership
        .load_many(artist_membership_tenure_history::Entity, db)
        .await?;

    let artist_membership_models =
        artist_membership.iter().map(|artist_membership_history| {
            let (group_id, member_id) = if artist_type.is_multiple() {
                (artist_id, artist_membership_history.artist_id)
            } else {
                (artist_membership_history.artist_id, artist_id)
            };

            artist_membership::ActiveModel {
                id: NotSet,
                group_id: Set(group_id),
                member_id: Set(member_id),
            }
        });

    let new_memberships =
        artist_membership::Entity::insert_many(artist_membership_models)
            .exec_with_returning_many(db)
            .await?;

    let role_models = new_memberships
        .iter()
        .zip(artist_membership_role.iter())
        .flat_map(|(membership, role_history)| {
            role_history.iter().map(|role| {
                artist_membership_role::ActiveModel {
                    membership_id: Set(membership.id),
                    role_id: Set(role.role_id),
                }
            })
        });

    artist_membership_role::Entity::insert_many(role_models)
        .exec(db)
        .await?;

    let tenure_models = new_memberships
        .iter()
        .zip(artist_membership_tenure.iter())
        .flat_map(|(membership, tenure_history)| {
            tenure_history.iter().map(|tenure| {
                artist_membership_tenure::ActiveModel {
                    id: NotSet,
                    membership_id: Set(membership.id),
                    join_year: Set(tenure.join_year),
                    leave_year: Set(tenure.leave_year),
                }
            })
        });

    artist_membership_tenure::Entity::insert_many(tenure_models)
        .exec(db)
        .await?;

    Ok(())
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
