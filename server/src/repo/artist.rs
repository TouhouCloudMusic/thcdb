use axum::http::StatusCode;
use derive_more::From;
use entity::sea_orm_active_enums::{ArtistType, EntityType};
use entity::{
    artist, artist_alias, artist_alias_history, artist_history, artist_link,
    artist_link_history, artist_localized_name, artist_localized_name_history,
    artist_membership, artist_membership_history, artist_membership_role,
    artist_membership_role_history, artist_membership_tenure,
    artist_membership_tenure_history, correction, correction_revision,
};
use error_set::error_set;
use itertools::{Itertools, izip};
use macros::ApiError;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait,
    DatabaseTransaction, DbErr, EntityName, EntityTrait, LoaderTrait,
    ModelTrait, QueryFilter, QueryOrder, TryInsertResult,
};
use tokio::try_join;

use crate::domain::share::model::NewLocalizedName;
use crate::dto::artist::{ArtistCorrection, NewGroupMember};
use crate::error::ServiceError;
use crate::repo;
use crate::utils::{Pipe, Reverse};

error_set! {
    #[derive(ApiError, From)]
    Error = {
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
            into_response = self
        )]
        Validation(ValidationError),
        #[from(DbErr)]
        General(ServiceError)
    };
    ValidationError = {
        #[display("Unknown type artist cannot have members")]
        UnknownTypeArtistOwnedMember,
    };
}

/// TODO: validate data
pub async fn create_correction(
    artist_id: i32,
    user_id: i32,
    data: ArtistCorrection,
    tx: &DatabaseTransaction,
) -> Result<entity::correction::Model, Error> {
    validate(&data)?;

    let history = save_artist_history_and_relations(&data, tx).await?;

    let correction = repo::correction::create()
        .author_id(user_id)
        .entity_id(artist_id)
        .entity_type(EntityType::Artist)
        .history_id(history.id)
        .description(data.correction_metadata.description)
        .call(tx)
        .await?;

    Ok(correction)
}

/// Must check correction whether is valid before call this function
/// TODO: validate data
pub async fn update_correction(
    user_id: i32,
    correction: correction::Model,
    data: ArtistCorrection,
    db: &DatabaseTransaction,
) -> Result<(), Error> {
    validate(&data)?;

    let history = save_artist_history_and_relations(&data, db).await?;

    repo::correction::update()
        .author_id(user_id)
        .history_id(history.id)
        .correction_id(correction.id)
        .description(data.correction_metadata.description)
        .call(db)
        .await?;

    Ok(())
}

pub(super) async fn apply_correction(
    correction: correction::Model,
    db: &DatabaseTransaction,
) -> Result<(), ServiceError> {
    let revision = correction
        .find_related(correction_revision::Entity)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(db)
        .await?
        .ok_or_else(|| ServiceError::UnexpRelatedEntityNotFound {
            entity_name: correction_revision::Entity.table_name(),
        })?;

    let history =
        artist_history::Entity::find_by_id(revision.entity_history_id)
            .one(db)
            .await?
            .ok_or_else(|| ServiceError::UnexpRelatedEntityNotFound {
                entity_name: artist_history::Entity.table_name(),
            })?;

    let mut artist_active_model = artist::ActiveModel::from(&history);
    artist_active_model.id = Set(correction.entity_id);

    artist_active_model.update(db).await?;

    let aliases = history
        .find_related(artist_alias_history::Entity)
        .all(db)
        .await?
        .into_iter()
        .map(|x| x.alias_id);

    update_artist_aliases(correction.entity_id, aliases, db).await?;

    let links = history
        .find_related(artist_link_history::Entity)
        .all(db)
        .await?
        .into_iter()
        .map(|x| x.url);

    update_artist_links(correction.entity_id, links, db).await?;

    let localized_names = history
        .find_related(artist_localized_name_history::Entity)
        .all(db)
        .await?
        .into_iter()
        .map(NewLocalizedName::from);

    update_artist_localized_names(correction.entity_id, localized_names, db)
        .await?;

    let artist_membership = history
        .find_related(artist_membership_history::Entity)
        .all(db)
        .await?;

    let artist_membership_role = artist_membership
        .load_many(artist_membership_role_history::Entity, db)
        .await?;

    let artist_membership_tenure = artist_membership
        .load_many(artist_membership_tenure_history::Entity, db)
        .await?;

    update_artist_artist_membership(
        correction.entity_id,
        history.artist_type,
        izip!(
            artist_membership,
            artist_membership_role,
            artist_membership_tenure
        )
        .collect_vec(),
        db,
    )
    .await?;

    Ok(())
}

fn validate(data: &ArtistCorrection) -> Result<(), ValidationError> {
    if data.artist_type.is_unknown()
        && data.members.as_ref().is_some_and(|x| !x.is_empty())
    {
        Err(ValidationError::UnknownTypeArtistOwnedMember)
    } else {
        Ok(())
    }
}

async fn create_artist_alias<C: ConnectionTrait>(
    artist_id: i32,
    aliases: Option<&[i32]>,
    db: &C,
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

async fn create_artist_alias_history<C: ConnectionTrait>(
    history_id: i32,
    aliases: Option<&[i32]>,
    db: &C,
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

async fn create_artist_link<C: ConnectionTrait>(
    artist_id: i32,
    links: Option<&[String]>,
    db: &C,
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

async fn create_artist_link_history<C: ConnectionTrait>(
    artist_id: i32,
    links: Option<&[String]>,
    db: &C,
) -> Result<(), DbErr> {
    if let Some(links) = links {
        let model = links.iter().map(|url| artist_link_history::ActiveModel {
            id: NotSet,
            history_id: Set(artist_id),
            url: Set(url.to_string()),
        });

        artist_link_history::Entity::insert_many(model)
            .on_empty_do_nothing()
            .exec(db)
            .await?;
    }

    Ok(())
}

async fn create_artist_localized_name<C: ConnectionTrait>(
    artist_id: i32,
    localized_names: Option<&[NewLocalizedName]>,
    db: &C,
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

async fn create_artist_localized_name_history<C: ConnectionTrait>(
    artist_id: i32,
    localized_names: Option<&[NewLocalizedName]>,
    db: &C,
) -> Result<(), DbErr> {
    if let Some(localized_names) = localized_names {
        let model = localized_names.iter().map(|x| {
            artist_localized_name_history::ActiveModel {
                id: NotSet,
                history_id: Set(artist_id),
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

async fn create_artist_artist_membership<C: ConnectionTrait>(
    artist_id: i32,
    artist_type: ArtistType,
    members: Option<&[NewGroupMember]>,
    db: &C,
) -> Result<(), DbErr> {
    if let Some(members) = members {
        let (artist_membership_model, todo_roles, todo_join_leaves): (
            Vec<_>,
            Vec<_>,
            Vec<_>,
        ) = members
            .iter()
            .map(|member| {
                let (group_id, member_id) = if artist_type.is_solo() {
                    (Set(member.artist_id), Set(artist_id))
                } else {
                    (Set(artist_id), Set(member.artist_id))
                };

                let artist_membership_model = artist_membership::ActiveModel {
                    id: NotSet,
                    member_id,
                    group_id,
                };

                let todo_roles = member.roles.iter().map(|role_id| {
                    artist_membership_role::ActiveModel {
                        membership_id: NotSet,
                        role_id: Set(*role_id),
                    }
                });

                let todo_join_leaves =
                    member.join_leave.clone().into_iter().map(
                        |(join_year, leave_year)| {
                            artist_membership_tenure::ActiveModel {
                                id: NotSet,
                                membership_id: NotSet,
                                join_year: Set(join_year),
                                leave_year: Set(leave_year),
                            }
                        },
                    );

                (artist_membership_model, todo_roles, todo_join_leaves)
            })
            .multiunzip();

        let TryInsertResult::Inserted(new_artist_memberships) =
            artist_membership::Entity::insert_many(artist_membership_model)
                .on_empty_do_nothing()
                .exec_with_returning_many(db)
                .await?
        else {
            return Ok(());
        };

        let role_models = new_artist_memberships
            .iter()
            .zip(todo_roles.into_iter())
            .flat_map(|(artist_membership, roles)| {
                roles.into_iter().map(|mut active_model| {
                    active_model.membership_id = Set(artist_membership.id);
                    active_model
                })
            });

        let join_leave_models = new_artist_memberships
            .iter()
            .zip(todo_join_leaves.into_iter())
            .flat_map(|(artist_membership, join_leaves)| {
                join_leaves.into_iter().map(|mut active_model| {
                    active_model.membership_id = Set(artist_membership.id);
                    active_model
                })
            });

        // We checked length of members before, so this should be safe

        artist_membership_role::Entity::insert_many(role_models)
            .exec(db)
            .await?;

        artist_membership_tenure::Entity::insert_many(join_leave_models)
            .exec(db)
            .await?;
    }

    Ok(())
}

async fn create_artist_artist_membership_history<'f, C: ConnectionTrait>(
    history_id: i32,
    members: Option<&'f [NewGroupMember]>,
    db: &'f C,
) -> Result<(), DbErr> {
    if let Some(members) = members
        && !members.is_empty()
    {
        let (artist_membership_history_model, todo_roles, todo_join_leaves): (
            Vec<_>,
            Vec<_>,
            Vec<_>,
        ) = members
            .iter()
            .map(|member| {
                (
                    artist_membership_history::ActiveModel {
                        id: NotSet,
                        history_id: Set(history_id),
                        artist_id: Set(member.artist_id),
                    },
                    member.roles.iter().map(|role_id| {
                        artist_membership_role_history::ActiveModel {
                            membership_history_id: NotSet,
                            role_id: Set(*role_id),
                        }
                    }),
                    member.join_leave.clone().into_iter().map(
                        |(join_year, leave_year)| {
                            artist_membership_tenure_history::ActiveModel {
                                id: NotSet,
                                membership_history_id: NotSet,
                                join_year: Set(join_year),
                                leave_year: Set(leave_year),
                            }
                        },
                    ),
                )
            })
            .multiunzip();

        let new_artist_memberships =
            artist_membership_history::Entity::insert_many(
                artist_membership_history_model,
            )
            .exec_with_returning_many(db)
            .await?;

        let role_models = new_artist_memberships
            .iter()
            .zip(todo_roles.into_iter())
            .flat_map(|(artist_membership_history, roles)| {
                roles.into_iter().map(|mut active_model| {
                    active_model.membership_history_id =
                        Set(artist_membership_history.id);
                    active_model
                })
            });

        let join_leave_models = new_artist_memberships
            .iter()
            .zip(todo_join_leaves.into_iter())
            .flat_map(|(history, join_leaves)| {
                join_leaves.into_iter().map(|mut active_model| {
                    active_model.membership_history_id = Set(history.id);
                    active_model
                })
            });

        artist_membership_role_history::Entity::insert_many(role_models)
            .exec(db)
            .await?;

        artist_membership_tenure_history::Entity::insert_many(
            join_leave_models,
        )
        .exec(db)
        .await?;
    }

    Ok(())
}

async fn save_artist_and_relations(
    data: &ArtistCorrection,
    db: &DatabaseTransaction,
) -> Result<artist::Model, Error> {
    let artist = artist::ActiveModel::from(data).insert(db).await?;

    try_join!(
        create_artist_alias(artist.id, data.aliases.as_deref(), db),
        create_artist_link(artist.id, data.links.as_deref(), db),
        create_artist_localized_name(
            artist.id,
            data.localized_name.as_deref(),
            db
        ),
        create_artist_artist_membership(
            artist.id,
            data.artist_type,
            data.members.as_deref(),
            db,
        ),
    )?;

    Ok(artist)
}

async fn save_artist_history_and_relations(
    data: &ArtistCorrection,
    db: &DatabaseTransaction,
) -> Result<artist_history::Model, Error> {
    let history = artist_history::ActiveModel::from(data).insert(db).await?;

    try_join!(
        create_artist_alias_history(history.id, data.aliases.as_deref(), db),
        create_artist_link_history(history.id, data.links.as_deref(), db),
        create_artist_localized_name_history(
            history.id,
            data.localized_name.as_deref(),
            db,
        ),
        create_artist_artist_membership_history(
            history.id,
            data.members.as_deref(),
            db
        ),
    )?;

    Ok(history)
}

async fn update_artist_aliases<
    I: IntoIterator<Item = i32>,
    C: ConnectionTrait,
>(
    artist_id: i32,
    aliases: I,
    db: &C,
) -> Result<(), DbErr> {
    artist_alias::Entity::delete_many()
        .filter(
            Condition::any()
                .add(artist_alias::Column::FirstId.eq(artist_id))
                .add(artist_alias::Column::SecondId.eq(artist_id)),
        )
        .exec(db)
        .await?;

    let model = aliases
        .into_iter()
        .map(|id| artist_alias::ActiveModel {
            first_id: Set(id.min(artist_id)),
            second_id: Set(id.max(artist_id)),
        })
        .collect::<Vec<_>>();

    if model.is_empty() {
        return Ok(());
    }

    artist_alias::Entity::insert_many(model).exec(db).await?;

    Ok(())
}

async fn update_artist_links<
    C: ConnectionTrait,
    I: IntoIterator<Item = String>,
>(
    artist_id: i32,
    links: I,
    db: &C,
) -> Result<(), DbErr> {
    artist_link::Entity::delete_many()
        .filter(artist_link::Column::ArtistId.eq(artist_id))
        .exec(db)
        .await?;

    let model = links
        .into_iter()
        .map(|x| artist_link::ActiveModel {
            artist_id: Set(artist_id),
            id: NotSet,
            url: Set(x),
        })
        .collect::<Vec<_>>();

    if model.is_empty() {
        return Ok(());
    }

    artist_link::Entity::insert_many(model).exec(db).await?;

    Ok(())
}

async fn update_artist_localized_names(
    artist_id: i32,
    localized_names: impl IntoIterator<Item = NewLocalizedName>,
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    artist_localized_name::Entity::delete_many()
        .filter(artist_localized_name::Column::ArtistId.eq(artist_id))
        .exec(db)
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

    if models.is_empty() {
        return Ok(());
    }

    artist_localized_name::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}

async fn update_artist_artist_membership(
    artist_id: i32,
    artist_type: ArtistType,
    members: Vec<(
        artist_membership_history::Model,
        Vec<artist_membership_role_history::Model>,
        Vec<artist_membership_tenure_history::Model>,
    )>,
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    // artist_membership_role and artist_membership_tenure are deleted by database cascade
    artist_membership::Entity::delete_many()
        .filter(
            Condition::any()
                .add(artist_membership::Column::MemberId.eq(artist_id))
                .add(artist_membership::Column::GroupId.eq(artist_id)),
        )
        .exec(db)
        .await?;

    if artist_type == ArtistType::Unknown || members.is_empty() {
        return Ok(());
    }

    let artist_membership_models =
        members.iter().map(|(artist_membership_history, _, _)| {
            let (group_id, member_id) =
                (artist_id, artist_membership_history.artist_id).pipe(|x| {
                    if artist_type.is_multiple() {
                        x
                    } else {
                        x.rev()
                    }
                });

            artist_membership::ActiveModel {
                id: NotSet,
                group_id: Set(group_id),
                member_id: Set(member_id),
            }
        });

    let res = artist_membership::Entity::insert_many(artist_membership_models)
        .exec_with_returning_many(db)
        .await?;

    let role_models =
        res.iter()
            .zip(members.iter())
            .flat_map(|(a, (_, role_history, _))| {
                role_history.iter().map(|m| {
                    artist_membership_role::ActiveModel {
                        membership_id: Set(a.id),
                        role_id: Set(m.role_id),
                    }
                })
            });

    artist_membership_role::Entity::insert_many(role_models)
        .exec(db)
        .await?;

    let join_leave_models =
        res.iter()
            .zip(members.iter())
            .flat_map(|(res, (_, _, jl_history))| {
                jl_history.iter().map(|model| {
                    artist_membership_tenure::ActiveModel {
                        id: NotSet,
                        membership_id: Set(res.id),
                        join_year: Set(model.join_year),
                        leave_year: Set(model.leave_year),
                    }
                })
            });

    artist_membership_tenure::Entity::insert_many(join_leave_models)
        .exec(db)
        .await?;

    Ok(())
}

impl From<artist_localized_name_history::Model> for NewLocalizedName {
    fn from(value: artist_localized_name_history::Model) -> Self {
        Self {
            language_id: value.language_id,
            name: value.name,
        }
    }
}

#[cfg(test)]
mod test {

    // #[tokio::test]
    // async fn get_artist_membership_from_artist_history_exec() -> Result<(), DbErr> {
    //     // TODO: Test env and test database
    //     dotenvy::dotenv().ok();
    //     let config = crate::infrastructure::config::Config::init();
    //     let client = get_connection(&config.database_url).await;

    //     let res = client
    //         .query_one(Statement::from_sql_and_values(
    //             DbBackend::Postgres,
    //             &*GET_artist_membership_FROM_ARTIST_HISTORY_BY_ID_SQL,
    //             [1.into()],
    //         ))
    //         .await
    //         .expect("Error while query");

    //     println!("Query result: {res:?}");

    //     if let Some(result) = res {
    //         let pr = GroupMemberFromHistory::from_query_result(&result, "")
    //             .map_err(|e| {
    //                 eprint!("{e:?}");

    //                 e
    //             });
    //         println!("Parsed result: {pr:?}");
    //     }

    //     Ok(())
    // }
}
