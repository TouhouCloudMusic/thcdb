use std::sync::LazyLock;
use std::vec;

use entity::sea_orm_active_enums::{ArtistType, EntityType};
use entity::{
    artist, artist_alias, artist_alias_history, artist_history, artist_link,
    artist_link_history, artist_localized_name, artist_localized_name_history,
    correction_revision, group_member, group_member_history,
    group_member_join_leave, group_member_join_leave_history,
    group_member_role, group_member_role_history,
};
use error_set::error_set;
use itertools::Itertools;
use sea_orm::prelude::Expr;
use sea_orm::sea_query::{Alias, PostgresQueryBuilder, Query};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait,
    DatabaseTransaction, DbBackend, DbErr, EntityTrait, FromQueryResult,
    ModelTrait, QueryFilter, QueryOrder, Statement,
};

use crate::dto::artist::{GeneralArtistDto, LocalizedName};
use crate::pg_func_ext::PgFuncExt;
use crate::repo;
use crate::types::Pair;

error_set! {
    Error = ValidationError || UnexpectedError || {
        Database(DbErr),
        #[display("The correction to be applied dosen't exist")]
        CorretionNotFound
    };
    ValidationError = {
        #[display("Unknown type artist cannot have members")]
        UnknownTypeArtistOwnedMember,
        #[display("Incorrect correction entity type")]
        IncorrectCorrectionEntityType
    };
    UnexpectedError = {
        #[display("Unexpected error: related entity {entity_name} not found")]
        EntityNotFound {
            entity_name: &'static str
        }
    };

}

#[allow(clippy::too_many_lines)]
pub async fn create(
    data: GeneralArtistDto,
    tx: &DatabaseTransaction,
) -> Result<artist::Model, Error> {
    validate(&data)?;

    let new_artist = artist::ActiveModel::from(&data).insert(tx).await?;
    let new_artist_history =
        artist_history::ActiveModel::from(&data).insert(tx).await?;

    let new_correction = repo::correction::create_self_approval()
        .author_id(data.author_id)
        .entity_type(EntityType::Artist)
        .entity_id(new_artist.id)
        .description(data.description.clone())
        .db(tx)
        .call()
        .await?;

    repo::correction::link_history(
        new_correction.id,
        new_artist_history.id,
        data.description,
        tx,
    )
    .await?;

    if let Some(aliases) = data.aliases {
        create_artist_alias(new_artist.id, &aliases, tx).await?;
        create_artist_alias_history(new_artist_history.id, &aliases, tx)
            .await?;
    };

    if let Some(links) = data.links {
        let models: (Vec<_>, Vec<_>) = links
            .into_iter()
            .map(|link| {
                (
                    artist_link::ActiveModel {
                        id: NotSet,
                        artist_id: Set(new_artist.id),
                        url: Set(link.clone()),
                    },
                    artist_link_history::ActiveModel {
                        id: NotSet,
                        history_id: Set(new_artist_history.id),
                        url: Set(link),
                    },
                )
            })
            .unzip();

        artist_link::Entity::insert_many(models.0).exec(tx).await?;

        artist_link_history::Entity::insert_many(models.1)
            .exec(tx)
            .await?;
    }
    if let Some(localized_names) = data.localized_name {
        let models: (Vec<_>, Vec<_>) = localized_names
            .into_iter()
            .map(|name| {
                (
                    artist_localized_name::ActiveModel {
                        id: NotSet,
                        artist_id: Set(new_artist.id),
                        language_id: Set(name.language_id),
                        name: Set(name.name.clone()),
                    },
                    artist_localized_name_history::ActiveModel {
                        id: NotSet,
                        artist_history_id: Set(new_artist_history.id),
                        language_id: Set(name.language_id),
                        name: Set(name.name),
                    },
                )
            })
            .unzip();

        artist_localized_name::Entity::insert_many(models.0)
            .exec(tx)
            .await?;

        artist_localized_name_history::Entity::insert_many(models.1)
            .exec(tx)
            .await?;
    }

    if let Some(members) = data.members {
        let (
            member_model,
            member_history_model,
            todo_roles,
            todo_roles_historys,
            todo_join_leaves,
            todo_join_leaves_history,
        ): (Vec<_>, Vec<_>, Vec<_>, Vec<_>, Vec<_>, Vec<_>) = members
            .into_iter()
            .map(|member| {
                let mut todo_roles = vec![];
                let mut todo_roles_history = vec![];
                let mut todo_join_levaes = vec![];
                let mut todo_join_levaes_history = vec![];

                let (group_id, member_id) = if new_artist.artist_type.is_solo()
                {
                    (Set(member.artist_id), Set(new_artist.id))
                } else {
                    (Set(new_artist.id), Set(member.artist_id))
                };

                for role_id in member.roles {
                    todo_roles.push(group_member_role::ActiveModel {
                        group_member_id: NotSet,
                        role_id: Set(role_id),
                    });
                    todo_roles_history.push(
                        group_member_role_history::ActiveModel {
                            group_member_history_id: NotSet,
                            role_id: Set(role_id),
                        },
                    );
                }

                for (join_year, leave_year) in member.join_leave {
                    todo_join_levaes.push(
                        group_member_join_leave::ActiveModel {
                            id: NotSet,
                            group_member_id: NotSet,
                            join_year: Set(join_year.clone().into()),
                            leave_year: Set(leave_year.clone().into()),
                        },
                    );
                    todo_join_levaes_history.push(
                        group_member_join_leave_history::ActiveModel {
                            id: NotSet,
                            group_member_history_id: NotSet,
                            join_year: Set(join_year.into()),
                            leave_year: Set(leave_year.into()),
                        },
                    );
                }

                (
                    group_member::ActiveModel {
                        id: NotSet,
                        member_id,
                        group_id,
                    },
                    group_member_history::ActiveModel {
                        id: NotSet,
                        history_id: Set(new_artist_history.id),
                        artist_id: Set(member.artist_id),
                    },
                    todo_roles,
                    todo_roles_history,
                    todo_join_levaes,
                    todo_join_levaes_history,
                )
            })
            .multiunzip();

        let new_group_members = group_member::Entity::insert_many(member_model)
            .exec_with_returning_many(tx)
            .await?;

        let new_group_member_historys =
            group_member_history::Entity::insert_many(member_history_model)
                .exec_with_returning_many(tx)
                .await?;

        let role_models = new_group_members
            .iter()
            .zip(todo_roles.into_iter())
            .flat_map(|(group_member, roles)| {
                roles.into_iter().map(|mut active_model| {
                    active_model.group_member_id = Set(group_member.id);
                    active_model
                })
            });
        let role_history_models = new_group_member_historys
            .iter()
            .zip(todo_roles_historys.into_iter())
            .flat_map(|(history, roles)| {
                roles.into_iter().map(|mut active_model| {
                    active_model.group_member_history_id = Set(history.id);
                    active_model
                })
            });

        let join_leave_models = new_group_members
            .iter()
            .zip(todo_join_leaves.into_iter())
            .flat_map(|(group_member, join_leaves)| {
                join_leaves.into_iter().map(|mut active_model| {
                    active_model.group_member_id = Set(group_member.id);
                    active_model
                })
            });
        let join_leave_history_models = new_group_member_historys
            .iter()
            .zip(todo_join_leaves_history.into_iter())
            .flat_map(|(history, join_leaves)| {
                join_leaves.into_iter().map(|mut active_model| {
                    active_model.group_member_history_id = Set(history.id);
                    active_model
                })
            });

        group_member_role::Entity::insert_many(role_models)
            .exec(tx)
            .await?;
        group_member_role_history::Entity::insert_many(role_history_models)
            .exec(tx)
            .await?;
        group_member_join_leave::Entity::insert_many(join_leave_models)
            .exec(tx)
            .await?;
        group_member_join_leave_history::Entity::insert_many(
            join_leave_history_models,
        )
        .exec(tx)
        .await?;
    };

    Ok(new_artist)
}

#[allow(clippy::too_many_lines)]
pub async fn create_correction(
    artist_id: i32,
    data: GeneralArtistDto,
    tx: &DatabaseTransaction,
) -> Result<entity::correction::Model, Error> {
    validate(&data)?;

    let mut artist_active_model = artist::ActiveModel::from(&data);

    let mut artist_history_active_model =
        artist_history::ActiveModel::from(&data);

    artist_active_model.id = Set(artist_id);
    artist_history_active_model.id = Set(artist_id);

    artist::Entity::update(artist_active_model).exec(tx).await?;
    let history = artist_history::Entity::update(artist_history_active_model)
        .exec(tx)
        .await?;

    let correction = repo::correction::create()
        .entity_type(EntityType::Artist)
        .description(data.description.clone())
        .entity_id(artist_id)
        .author_id(data.author_id)
        .db(tx)
        .call()
        .await?;

    repo::correction::link_history(
        correction.id,
        history.id,
        data.description,
        tx,
    )
    .await?;

    if let Some(aliases) = data.aliases {
        create_artist_alias_history(history.id, &aliases, tx).await?;
    };

    if let Some(links) = data.links {
        let models =
            links
                .into_iter()
                .map(|link| artist_link_history::ActiveModel {
                    id: NotSet,
                    history_id: Set(history.id),
                    url: Set(link),
                });

        artist_link_history::Entity::insert_many(models)
            .exec(tx)
            .await?;
    }

    if let Some(localized_names) = data.localized_name {
        let models = localized_names.into_iter().map(|name| {
            artist_localized_name_history::ActiveModel {
                id: NotSet,
                artist_history_id: Set(history.id),
                language_id: Set(name.language_id),
                name: Set(name.name),
            }
        });

        artist_localized_name_history::Entity::insert_many(models)
            .exec(tx)
            .await?;
    }

    if let Some(members) = data.members {
        let (
            member_history_model,
            todo_roles_historys,
            todo_join_leaves_history,
        ): (Vec<_>, Vec<_>, Vec<_>) = members
            .into_iter()
            .map(|member| {
                let todo_roles_history = member
                    .roles
                    .into_iter()
                    .map(|role_id| group_member_role_history::ActiveModel {
                        group_member_history_id: NotSet,
                        role_id: Set(role_id),
                    })
                    .collect_vec();

                let todo_join_levaes_history = member
                    .join_leave
                    .into_iter()
                    .map(|(join_year, leave_year)| {
                        group_member_join_leave_history::ActiveModel {
                            id: NotSet,
                            group_member_history_id: NotSet,
                            join_year: Set(join_year.into()),
                            leave_year: Set(leave_year.into()),
                        }
                    })
                    .collect_vec();

                (
                    group_member_history::ActiveModel {
                        id: NotSet,
                        history_id: Set(history.id),
                        artist_id: Set(member.artist_id),
                    },
                    todo_roles_history,
                    todo_join_levaes_history,
                )
            })
            .multiunzip();

        let new_group_member_historys =
            group_member_history::Entity::insert_many(member_history_model)
                .exec_with_returning_many(tx)
                .await?;

        let role_history_models = new_group_member_historys
            .iter()
            .zip(todo_roles_historys)
            .flat_map(|(history, roles)| {
                roles.into_iter().map(|mut active_model| {
                    active_model.group_member_history_id = Set(history.id);
                    active_model
                })
            });

        let join_leave_history_models = new_group_member_historys
            .iter()
            .zip(todo_join_leaves_history)
            .flat_map(|(history, join_leaves)| {
                join_leaves.into_iter().map(|mut active_model| {
                    active_model.group_member_history_id = Set(history.id);
                    active_model
                })
            });

        group_member_role_history::Entity::insert_many(role_history_models)
            .exec(tx)
            .await?;

        group_member_join_leave_history::Entity::insert_many(
            join_leave_history_models,
        )
        .exec(tx)
        .await?;
    };

    Ok(correction)
}

// TODO
#[allow(clippy::unused_async)]
pub async fn update_correction() {}

pub async fn apply_correction(
    correction_id: i32,
    approver_id: i32,
    db: &DatabaseTransaction,
) -> Result<(), Error> {
    let correction = repo::correction::find_by_id(correction_id, db)
        .await?
        .ok_or(Error::CorretionNotFound)
        .and_then(|model| {
            if model.entity_type == EntityType::Artist {
                Ok(model)
            } else {
                Err(Error::IncorrectCorrectionEntityType)
            }
        })?;

    repo::correction::approve(correction_id, approver_id, db).await?;

    let revision = correction
        .find_related(correction_revision::Entity)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(db)
        .await?
        .ok_or(UnexpectedError::EntityNotFound {
            entity_name: "correction_revision",
        })?;

    let history =
        artist_history::Entity::find_by_id(revision.entity_history_id)
            .one(db)
            .await?
            .ok_or(UnexpectedError::EntityNotFound {
                entity_name: "artist_history",
            })?;

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
        .map(LocalizedName::from);

    update_artist_localized_names(correction.entity_id, localized_names, db)
        .await?;

    let group_member =
        get_group_member_from_artist_history(history.id, db).await?;

    update_artist_group_member(
        correction.entity_id,
        history.artist_type,
        group_member,
        db,
    )
    .await?;

    Ok(())
}

fn validate(data: &GeneralArtistDto) -> Result<(), ValidationError> {
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
    aliases: &[i32],
    db: &C,
) -> Result<(), DbErr> {
    let model = aliases.iter().map(|id| artist_alias::ActiveModel {
        first_id: Set(*id.min(&artist_id)),
        second_id: Set(*id.max(&artist_id)),
    });

    artist_alias::Entity::insert_many(model).exec(db).await?;

    Ok(())
}

async fn create_artist_alias_history<C: ConnectionTrait>(
    history_id: i32,
    aliases: &[i32],
    db: &C,
) -> Result<(), DbErr> {
    let history_model =
        aliases.iter().map(|id| artist_alias_history::ActiveModel {
            history_id: Set(history_id),
            alias_id: Set(*id),
        });

    artist_alias_history::Entity::insert_many(history_model)
        .exec(db)
        .await?;

    Ok(())
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

    let model = aliases.into_iter().map(|id| artist_alias::ActiveModel {
        first_id: Set(id.min(artist_id)),
        second_id: Set(id.max(artist_id)),
    });

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

    artist_link::Entity::insert_many(model).exec(db).await?;

    Ok(())
}

async fn update_artist_localized_names<
    C: ConnectionTrait,
    I: IntoIterator<Item = LocalizedName>,
>(
    artist_id: i32,
    localized_names: I,
    db: &C,
) -> Result<(), DbErr> {
    artist_localized_name::Entity::delete_many()
        .filter(artist_localized_name::Column::ArtistId.eq(artist_id))
        .exec(db)
        .await?;

    let models = localized_names.into_iter().map(|x| {
        artist_localized_name::ActiveModel {
            id: NotSet,
            artist_id: Set(artist_id),
            language_id: Set(x.language_id),
            name: Set(x.name),
        }
    });

    artist_localized_name::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}

async fn update_artist_group_member<C: ConnectionTrait>(
    artist_id: i32,
    artist_type: ArtistType,
    members: Vec<GroupMemberFromHistory>,
    db: &C,
) -> Result<(), DbErr> {
    if artist_type == ArtistType::Unknown {
        return Ok(());
    }

    // group_member_role and group_member_join_leave are deleted by database cascade
    group_member::Entity::delete_many()
        .filter(
            Condition::any()
                .add(group_member::Column::MemberId.eq(artist_id))
                .add(group_member::Column::GroupId.eq(artist_id)),
        )
        .exec(db)
        .await?;

    let group_member_models =
        members.iter().map(|data| group_member::ActiveModel {
            group_id: Set(if artist_type.is_multiple() {
                artist_id
            } else {
                data.member_id
            }),
            member_id: Set(if artist_type.is_multiple() {
                data.member_id
            } else {
                artist_id
            }),
            id: NotSet,
        });

    let res = group_member::Entity::insert_many(group_member_models)
        .exec_with_returning_many(db)
        .await?;

    let role_models = res.iter().zip(members.iter()).flat_map(|(a, b)| {
        b.roles.iter().map(|x| group_member_role::ActiveModel {
            group_member_id: Set(a.id),
            role_id: Set(*x),
        })
    });

    group_member_role::Entity::insert_many(role_models)
        .exec(db)
        .await?;

    let join_leave_models =
        res.iter().zip(members.iter()).flat_map(|(a, b)| {
            b.join_leave
                .iter()
                .map(|x| group_member_join_leave::ActiveModel {
                    id: NotSet,
                    group_member_id: Set(a.id),
                    join_year: Set(x.0.clone()),
                    leave_year: Set(x.1.clone()),
                })
        });

    group_member_join_leave::Entity::insert_many(join_leave_models)
        .exec(db)
        .await?;

    Ok(())
}

static GET_GROUP_MEMBER_FROM_ARTIST_HISTORY_BY_ID_SQL: LazyLock<String> =
    LazyLock::<String>::new(|| {
        use entity::group_member_join_leave_history as join_leave_history;

        let query = Query::select()
            .column(group_member_history::Column::ArtistId)
            .expr_as(
                PgFuncExt::array_agg(Expr::col((
                    group_member_role_history::Entity,
                    group_member_role_history::Column::RoleId,
                ))),
                Alias::new("role_id"),
            )
            .expr_as(
                PgFuncExt::array_agg(Expr::tuple(
                    [
                        join_leave_history::Column::JoinYear,
                        join_leave_history::Column::LeaveYear,
                    ]
                    .map(|x| Expr::col(x).into()),
                )),
                Alias::new("join_leave"),
            )
            .from(group_member_history::Entity)
            .left_join(
                group_member_role_history::Entity,
                Expr::col((
                    group_member_role_history::Entity,
                    group_member_role_history::Column::GroupMemberHistoryId,
                ))
                .equals((
                    group_member_history::Entity,
                    group_member_history::Column::Id,
                )),
            )
            .left_join(
                join_leave_history::Entity,
                Expr::col((
                    group_member_role_history::Entity,
                    join_leave_history::Column::GroupMemberHistoryId,
                ))
                .equals((
                    group_member_history::Entity,
                    group_member_history::Column::Id,
                )),
            )
            .and_where(
                Expr::col((
                    group_member_history::Entity,
                    group_member_history::Column::Id,
                ))
                .eq(1),
            )
            .add_group_by([
                Expr::col(group_member_history::Column::ArtistId).into()
            ])
            .to_owned();

        let (stmt, _) = query.build(PostgresQueryBuilder);

        stmt
    });

#[derive(Debug)]
struct GroupMemberFromHistory {
    pub member_id: i32,
    pub roles: Vec<i32>,
    pub join_leave: Vec<Pair<Option<String>>>,
}

impl FromQueryResult for GroupMemberFromHistory {
    fn from_query_result(
        res: &sea_orm::QueryResult,
        pre: &str,
    ) -> Result<Self, DbErr> {
        use sea_orm::JsonValue;
        let json_value: JsonValue = res.try_get(pre, "join_leave")?;
        let join_leave =
            json_value.as_array().map_or_else(std::vec::Vec::new, |x| {
                x.iter()
                    .map(|x| {
                        let first = x
                            .get(0)
                            .and_then(JsonValue::as_str)
                            .map(Into::into);

                        let second = x
                            .get(1)
                            .and_then(JsonValue::as_str)
                            .map(Into::into);

                        (first, second)
                    })
                    .collect()
            });
        Ok(Self {
            member_id: res.try_get(pre, "artist_id")?,
            roles: res.try_get(pre, "role_id")?,
            join_leave,
        })
    }
}

async fn get_group_member_from_artist_history<C: ConnectionTrait>(
    history_id: i32,
    db: &C,
) -> Result<Vec<GroupMemberFromHistory>, DbErr> {
    db.query_all(Statement::from_sql_and_values(
        DbBackend::Postgres,
        &*GET_GROUP_MEMBER_FROM_ARTIST_HISTORY_BY_ID_SQL,
        [history_id.into()],
    ))
    .await?
    .into_iter()
    .map(|x| GroupMemberFromHistory::from_query_result(&x, ""))
    .try_collect()
}

#[cfg(test)]
mod test {
    use sea_orm::{
        ConnectionTrait, DbBackend, DbErr, FromQueryResult, Statement,
    };

    use crate::infrastructure::database::get_connection;
    use crate::repo::artist::{
        GroupMemberFromHistory, GET_GROUP_MEMBER_FROM_ARTIST_HISTORY_BY_ID_SQL,
    };

    #[test]
    fn get_group_member_from_artist_history_query_generation() {
        print!("{}", GET_GROUP_MEMBER_FROM_ARTIST_HISTORY_BY_ID_SQL.clone());
    }

    #[tokio::test]
    async fn get_group_member_from_artist_history_exec() -> Result<(), DbErr> {
        // TODO: Test env and test database
        dotenvy::dotenv().ok();
        let config = crate::infrastructure::config::Config::init();
        let client = get_connection(&config.database_url).await;

        let res = client
            .query_one(Statement::from_sql_and_values(
                DbBackend::Postgres,
                &*GET_GROUP_MEMBER_FROM_ARTIST_HISTORY_BY_ID_SQL,
                [1.into()],
            ))
            .await
            .expect("Error while query");

        println!("Query result: {res:?}");

        if let Some(result) = res {
            let pr = GroupMemberFromHistory::from_query_result(&result, "")
                .map_err(|e| {
                    eprint!("{e:?}");

                    e
                });
            println!("Parsed result: {pr:?}");
        }

        Ok(())
    }
}
