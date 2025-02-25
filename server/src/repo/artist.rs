use std::sync::LazyLock;

use axum::http::StatusCode;
use entity::prelude::{
    ArtistLink, ArtistLocalizedName, CreditRole, GroupMemberJoinLeave,
    GroupMemberRole,
};
use entity::sea_orm_active_enums::{ArtistType, EntityType};
use entity::{
    artist, artist_alias, artist_alias_history, artist_history, artist_link,
    artist_link_history, artist_localized_name, artist_localized_name_history,
    correction, correction_revision, group_member, group_member_history,
    group_member_join_leave, group_member_join_leave_history,
    group_member_role, group_member_role_history, language,
};
use error_set::error_set;
use itertools::{Itertools, izip};
use macros::ApiError;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::prelude::Expr;
use sea_orm::sea_query::{Alias, IntoCondition, PostgresQueryBuilder, Query};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait,
    DatabaseTransaction, DbBackend, DbErr, EntityName, EntityTrait,
    FromQueryResult, LoaderTrait, ModelTrait, QueryFilter, QueryOrder,
    Statement,
};
use tokio::try_join;

use crate::dto::artist::{
    ArtistCorrection, ArtistResponse, GroupMember, LocalizedName,
    NewGroupMember, NewLocalizedName,
};
use crate::error::{AsErrorCode, ErrorCode, RepositoryError};
use crate::repo;
use crate::types::Pair;
use crate::utils::orm::PgFuncExt;

error_set! {
    #[derive(ApiError)]
    Error = {
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
            into_response = self
        )]
        Validation(ValidationError),
        General(RepositoryError)
    };
    ValidationError = {
        #[display("Unknown type artist cannot have members")]
        UnknownTypeArtistOwnedMember,
    };
}

impl AsErrorCode for ValidationError {
    fn as_error_code(&self) -> ErrorCode {
        match self {
            Self::UnknownTypeArtistOwnedMember => {
                ErrorCode::UnknownTypeArtistOwnedMember
            }
        }
    }
}

impl From<DbErr> for Error {
    fn from(err: DbErr) -> Self {
        RepositoryError::from(err).into()
    }
}

pub async fn find_by_id(
    id: i32,
    db: &impl ConnectionTrait,
) -> Result<ArtistResponse, Error> {
    find_many(artist::Column::Id.eq(id), db)
        .await?
        .into_iter()
        .next()
        .ok_or_else(|| {
            RepositoryError::EntityNotFound {
                entity_name: artist::Entity.table_name(),
            }
            .into()
        })
}

pub async fn find_by_keyword(
    kw: &str,
    db: &impl ConnectionTrait,
) -> Result<Vec<ArtistResponse>, Error> {
    find_many(artist::Column::Name.like(kw), db).await
}

async fn find_many(
    cond: impl IntoCondition,
    db: &impl ConnectionTrait,
) -> Result<Vec<ArtistResponse>, Error> {
    let artists = artist::Entity::find().filter(cond).all(db).await?;

    let ids = artists.iter().map(|x| x.id).collect_vec();

    let aliases = artist_alias::Entity::find()
        .filter(
            Condition::any()
                .add(artist_alias::Column::FirstId.is_in(ids.clone()))
                .add(artist_alias::Column::SecondId.is_in(ids.clone())),
        )
        .all(db)
        .await?;

    let links = artists.load_many(ArtistLink, db).await?;

    let localized_names = artists.load_many(ArtistLocalizedName, db).await?;

    let group_members = group_member::Entity::find()
        .filter(
            Condition::any()
                .add(group_member::Column::MemberId.is_in(ids.clone()))
                .add(group_member::Column::GroupId.is_in(ids.clone())),
        )
        .all(db)
        .await?;

    let roles = group_members
        .load_many_to_many(CreditRole, GroupMemberRole, db)
        .await?;

    let join_leaves = group_members.load_many(GroupMemberJoinLeave, db).await?;

    let group_members = izip!(group_members, roles, join_leaves).collect_vec();

    let langs = language::Entity::find()
        .filter(
            language::Column::Id.is_in(
                localized_names
                    .iter()
                    .flat_map(|x| x.iter().map(|x| x.language_id)),
            ),
        )
        .all(db)
        .await?;

    let res = izip!(artists, links, localized_names)
        .map(|(artist, links, localized_names)| ArtistResponse {
            id: artist.id,
            name: artist.name,
            artist_type: artist.artist_type,
            text_alias: artist.text_alias,
            start_date: artist.start_date,
            start_date_precision: artist.start_date_precision,
            end_date: artist.end_date,
            end_date_precision: artist.end_date_precision,
            aliases: aliases
                .iter()
                .filter(|x| x.first_id == artist.id || x.second_id == artist.id)
                .map(|x| {
                    if x.first_id == artist.id {
                        x.second_id
                    } else {
                        x.first_id
                    }
                })
                .collect(),
            links: links.into_iter().map(|x| x.url).collect_vec(),
            localized_names: localized_names
                .into_iter()
                .map(|model| LocalizedName {
                    name: model.name,
                    language: langs
                        .iter()
                        .find(|y| y.id == model.language_id)
                        .unwrap()
                        .into(),
                })
                .collect(),
            members: group_members
                .iter()
                .filter(|(gm, _, _)| {
                    if artist.artist_type.is_solo() {
                        gm.member_id == artist.id
                    } else {
                        gm.group_id == artist.id
                    }
                })
                .map(|(gm, role, jl)| {
                    let artist_id = if artist.artist_type.is_solo() {
                        gm.group_id
                    } else {
                        gm.member_id
                    };

                    GroupMember {
                        artist_id,
                        join_leave: jl.iter().map_into().collect(),
                        roles: role.iter().map_into().collect(),
                    }
                })
                .collect(),
        })
        .collect_vec();

    Ok(res)
}

pub async fn create(
    data: ArtistCorrection,
    user_id: i32,
    db: &DatabaseTransaction,
) -> Result<artist::Model, Error> {
    validate(&data)?;

    let artist = save_artist_and_relations(&data, db).await?;

    let history = save_artist_history_and_relations(&data, db).await?;

    repo::correction::create_self_approval()
        .author_id(user_id)
        .entity_type(EntityType::Artist)
        .entity_id(artist.id)
        .history_id(history.id)
        .description(data.correction_metadata.description)
        .call(db)
        .await?;

    Ok(artist)
}

/// TODO: validate data on service layer
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
/// TODO: validate data on service layer
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
) -> Result<(), RepositoryError> {
    let revision = correction
        .find_related(correction_revision::Entity)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(db)
        .await?
        .ok_or_else(|| RepositoryError::UnexpRelatedEntityNotFound {
            entity_name: correction_revision::Entity.table_name(),
        })?;

    let history =
        artist_history::Entity::find_by_id(revision.entity_history_id)
            .one(db)
            .await?
            .ok_or_else(|| RepositoryError::UnexpRelatedEntityNotFound {
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

        artist_alias::Entity::insert_many(model).exec(db).await?;
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

        artist_link::Entity::insert_many(model).exec(db).await?;
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
            .exec(db)
            .await?;
    }

    Ok(())
}

async fn create_artist_group_member<'f, C: ConnectionTrait>(
    artist_id: i32,
    artist_type: ArtistType,
    members: Option<&'f [NewGroupMember]>,
    db: &'f C,
) -> Result<(), DbErr> {
    if let Some(members) = members {
        let (group_member_model, todo_roles, todo_join_leaves): (
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

                let group_member_model = group_member::ActiveModel {
                    id: NotSet,
                    member_id,
                    group_id,
                };

                let todo_roles = member.roles.iter().map(|role_id| {
                    group_member_role::ActiveModel {
                        group_member_id: NotSet,
                        role_id: Set(*role_id),
                    }
                });

                let todo_join_leaves =
                    member.join_leave.clone().into_iter().map(
                        |(join_year, leave_year)| {
                            group_member_join_leave::ActiveModel {
                                id: NotSet,
                                group_member_id: NotSet,
                                join_year: Set(join_year),
                                leave_year: Set(leave_year),
                            }
                        },
                    );

                (group_member_model, todo_roles, todo_join_leaves)
            })
            .multiunzip();

        let new_group_members =
            group_member::Entity::insert_many(group_member_model)
                .exec_with_returning_many(db)
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

        let join_leave_models = new_group_members
            .iter()
            .zip(todo_join_leaves.into_iter())
            .flat_map(|(group_member, join_leaves)| {
                join_leaves.into_iter().map(|mut active_model| {
                    active_model.group_member_id = Set(group_member.id);
                    active_model
                })
            });

        group_member_role::Entity::insert_many(role_models)
            .exec(db)
            .await?;

        group_member_join_leave::Entity::insert_many(join_leave_models)
            .exec(db)
            .await?;
    }

    Ok(())
}

async fn create_artist_group_member_history<'f, C: ConnectionTrait>(
    history_id: i32,
    members: Option<&'f [NewGroupMember]>,
    db: &'f C,
) -> Result<(), DbErr> {
    if let Some(members) = members {
        let (group_member_history_model, todo_roles, todo_join_leaves): (
            Vec<_>,
            Vec<_>,
            Vec<_>,
        ) = members
            .iter()
            .map(|member| {
                (
                    group_member_history::ActiveModel {
                        id: NotSet,
                        history_id: Set(history_id),
                        artist_id: Set(member.artist_id),
                    },
                    member.roles.iter().map(|role_id| {
                        group_member_role_history::ActiveModel {
                            group_member_history_id: NotSet,
                            role_id: Set(*role_id),
                        }
                    }),
                    member.join_leave.clone().into_iter().map(
                        |(join_year, leave_year)| {
                            group_member_join_leave_history::ActiveModel {
                                id: NotSet,
                                group_member_history_id: NotSet,
                                join_year: Set(join_year),
                                leave_year: Set(leave_year),
                            }
                        },
                    ),
                )
            })
            .multiunzip();

        let new_group_members = group_member_history::Entity::insert_many(
            group_member_history_model,
        )
        .exec_with_returning_many(db)
        .await?;

        let role_models = new_group_members
            .iter()
            .zip(todo_roles.into_iter())
            .flat_map(|(group_member_history, roles)| {
                roles.into_iter().map(|mut active_model| {
                    active_model.group_member_history_id =
                        Set(group_member_history.id);
                    active_model
                })
            });

        let join_leave_models = new_group_members
            .iter()
            .zip(todo_join_leaves.into_iter())
            .flat_map(|(history, join_leaves)| {
                join_leaves.into_iter().map(|mut active_model| {
                    active_model.group_member_history_id = Set(history.id);
                    active_model
                })
            });

        group_member_role_history::Entity::insert_many(role_models)
            .exec(db)
            .await?;

        group_member_join_leave_history::Entity::insert_many(join_leave_models)
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
        create_artist_group_member(
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
        create_artist_group_member_history(
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
    I: IntoIterator<Item = NewLocalizedName>,
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
    // group_member_role and group_member_join_leave are deleted by database cascade
    group_member::Entity::delete_many()
        .filter(
            Condition::any()
                .add(group_member::Column::MemberId.eq(artist_id))
                .add(group_member::Column::GroupId.eq(artist_id)),
        )
        .exec(db)
        .await?;

    if artist_type == ArtistType::Unknown {
        return Ok(());
    }

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

    // #[tokio::test]
    // async fn get_group_member_from_artist_history_exec() -> Result<(), DbErr> {
    //     // TODO: Test env and test database
    //     dotenvy::dotenv().ok();
    //     let config = crate::infrastructure::config::Config::init();
    //     let client = get_connection(&config.database_url).await;

    //     let res = client
    //         .query_one(Statement::from_sql_and_values(
    //             DbBackend::Postgres,
    //             &*GET_GROUP_MEMBER_FROM_ARTIST_HISTORY_BY_ID_SQL,
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
