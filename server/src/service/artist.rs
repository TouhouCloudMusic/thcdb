use entity::sea_orm_active_enums::{ArtistType, DatePrecision};
use entity::{
    artist, artist_alias, artist_alias_history, artist_history, artist_link,
    artist_link_history, group_member, group_member_history,
    group_member_join_leave, group_member_join_leave_history,
    group_member_role, group_member_role_history, link,
};
use itertools::{Either, Itertools};
use sea_orm::prelude::Date;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ConnectionTrait, DatabaseConnection, DbErr, EntityTrait,
    QueryResult, Statement, TransactionTrait,
};

use crate::model;
use crate::model::prelude::NewLink;
use crate::types::{Pair, VecPair};

#[allow(dead_code)]
#[derive(bon::Builder)]
pub struct NewArtist {
    pub name: String,
    pub artist_type: ArtistType,
    pub text_alias: Option<Vec<String>>,
    pub start_date: Option<Date>,
    pub start_date_precision: Option<DatePrecision>,
    pub members: Option<Vec<NewGroupMember>>,
    pub end_date: Option<Date>,
    pub end_date_precision: Option<DatePrecision>,
    pub aliases: Option<Vec<i32>>,
    pub links: Option<Vec<NewLink>>,
    pub author_id: i32,
    pub description: String,
}

pub struct NewGroupMember {
    artist_id: i32,
    roles: Vec<i32>,
    join_leave: Vec<Pair<String>>,
}

struct ChangeRequestMetaData {
    author_id: i32,
    description: String,
}

struct DestructedNewArtist {
    artist_active_model: artist::ActiveModel,
    artist_history_active_model: artist_history::ActiveModel,
    change_request_metadata: ChangeRequestMetaData,
    aliases: Option<Vec<i32>>,
    links: Option<Vec<NewLink>>,
    members: Option<Vec<NewGroupMember>>,
}

impl NewArtist {
    fn destruct(self) -> DestructedNewArtist {
        let artist_active_model = artist::ActiveModel {
            id: NotSet,
            name: Set(self.name.clone()),
            artist_type: Set(self.artist_type.clone()),
            text_alias: Set(self.text_alias.clone()),
            start_date: Set(self.start_date),
            start_date_precision: Set(self.start_date_precision.clone()),
            end_date: Set(self.end_date),
            end_date_precision: Set(self.end_date_precision.clone()),
            created_at: NotSet,
            updated_at: NotSet,
        };
        let artist_history_active_model = artist_history::ActiveModel {
            id: NotSet,
            name: Set(self.name.clone()),
            artist_type: Set(self.artist_type),
            text_alias: Set(self.text_alias),
            start_date: Set(self.start_date),
            start_date_precision: Set(self.start_date_precision),
            end_date: Set(self.end_date),
            end_date_precision: Set(self.end_date_precision),
            created_at: NotSet,
            updated_at: NotSet,
        };
        let change_request_metadata = ChangeRequestMetaData {
            author_id: self.author_id,
            description: self.description,
        };
        let aliases = self.aliases.filter(|aliases| !aliases.is_empty());
        let links = self.links.filter(|links| !links.is_empty());
        let members = self.members.filter(|members| !members.is_empty());

        DestructedNewArtist {
            artist_active_model,
            artist_history_active_model,
            change_request_metadata,
            aliases,
            links,
            members,
        }
    }
}

#[allow(dead_code)]
pub async fn create(
    data: NewArtist,
    db: &DatabaseConnection,
) -> Result<artist::Model, DbErr> {
    let transaction = db.begin().await?;
    let tx = &transaction;
    let DestructedNewArtist {
        artist_active_model,
        artist_history_active_model,
        change_request_metadata:
            ChangeRequestMetaData {
                author_id,
                description,
            },
        aliases,
        links,
        members,
    } = data.destruct();

    let new_artist = artist_active_model.insert(tx).await?;
    let new_artist_history = artist_history_active_model.insert(tx).await?;

    let new_change_request = model::change_request::create()
        .artist()
        .author_id(author_id)
        .description(description)
        .entity_created_at(new_artist.created_at)
        .db(db)
        .call()
        .await?;

    model::change_request::link_history(
        new_change_request.id,
        new_artist_history.id,
        db,
    )
    .await?;

    // TODO relation:  members,

    if let Some(aliases) = aliases {
        let (model, history_model): VecPair<_, _> = aliases
            .into_iter()
            .map(|id| {
                (
                    artist_alias::ActiveModel {
                        first_id: Set(id.min(new_artist.id)),
                        second_id: Set(id.max(new_artist.id)),
                    },
                    artist_alias_history::ActiveModel {
                        history_id: Set(new_artist_history.id),
                        alias_id: Set(id),
                    },
                )
            })
            .unzip();

        artist_alias::Entity::insert_many(model);
        artist_alias_history::Entity::insert_many(history_model);
    };

    if let Some(links) = links {
        use entity::link::*;

        struct CheckUrlExistsResult {
            url: String,
            link_id: Option<i32>,
            exists: bool,
        }

        impl CheckUrlExistsResult {
            fn from_query_result(value: QueryResult) -> Result<Self, DbErr> {
                Ok(Self {
                    url: value.try_get("", "url")?,
                    link_id: value.try_get("", "link_id")?,
                    exists: value.try_get("", "exists")?,
                })
            }
        }

        let url_list = links.iter().map(|link| link.url.clone()).collect_vec();
        const SQL: &str = r"--sql
            WITH url_list AS (
                SELECT unnest($1::text[]) AS url
            )
            SELECT link.id as link_id,
            EXISTS (SELECT 1 FROM link WHERE link.url = url_list.url) AS exists
            FROM url_list
            LEFT JOIN link on url_list.url = link.url
        ";
        let query = Statement::from_sql_and_values(
            db.get_database_backend(),
            SQL,
            [url_list.into()],
        );
        let result: Vec<_> = db
            .query_all(query)
            .await?
            .into_iter()
            .map(CheckUrlExistsResult::from_query_result)
            .try_collect()?;

        let (exist, not_exist): (Vec<_>, Vec<_>) =
            result.iter().zip(links).partition_map(|(line, link)| {
                if let Some(link_id) = line.link_id {
                    Either::Left((
                        artist_link::ActiveModel {
                            id: NotSet,
                            artist_id: Set(new_artist.id),
                            link_id: Set(link_id),
                        },
                        artist_link_history::ActiveModel {
                            id: NotSet,
                            history_id: Set(new_artist_history.id),
                            link_id: Set(link_id),
                        },
                    ))
                } else {
                    Either::Right(ActiveModel {
                        id: NotSet,
                        platform: Set(link.platform),
                        url: Set(link.url),
                    })
                }
            });

        let (artist_link_models, artist_link_history_models): (Vec<_>, Vec<_>) =
            exist.into_iter().unzip();

        let (first, second): (Vec<_>, Vec<_>) =
            link::Entity::insert_many(not_exist)
                .exec_with_returning_many(tx)
                .await?
                .into_iter()
                .map(|model| {
                    (
                        artist_link::ActiveModel {
                            id: NotSet,
                            artist_id: Set(new_artist.id),
                            link_id: Set(model.id),
                        },
                        artist_link_history::ActiveModel {
                            id: NotSet,
                            history_id: Set(new_artist_history.id),
                            link_id: Set(model.id),
                        },
                    )
                })
                .unzip();

        artist_link::Entity::insert_many(
            artist_link_models.into_iter().chain(first),
        )
        .exec(tx)
        .await?;

        artist_link_history::Entity::insert_many(
            artist_link_history_models.into_iter().chain(second),
        )
        .exec(tx)
        .await?;
    }

    if let Some(members) = members {
        if new_artist.artist_type.is_unknown() {
            return Err(DbErr::Custom(
                "Unknown artist type cannot have members".into(),
            ));
        }
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
                        id: NotSet,
                        group_member_id: NotSet,
                        role_id: Set(role_id),
                    });
                    todo_roles_history.push(
                        group_member_role_history::ActiveModel {
                            id: NotSet,
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

    transaction.commit().await?;
    Ok(new_artist)
}
