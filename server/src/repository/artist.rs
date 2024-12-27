use entity::sea_orm_active_enums::EntityType;
use entity::{
    artist, artist_alias, artist_alias_history, artist_history, artist_link,
    artist_link_history, group_member, group_member_history,
    group_member_join_leave, group_member_join_leave_history,
    group_member_role, group_member_role_history,
};
use itertools::Itertools;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ConnectionTrait, DatabaseTransaction, DbErr, EntityTrait,
};

use crate::dto::artist::GeneralArtistDto;
use crate::repository;

pub async fn create(
    data: GeneralArtistDto,
    tx: &DatabaseTransaction,
) -> Result<artist::Model, DbErr> {
    let artist_active_model = artist::ActiveModel::from(&data);
    let artist_history_active_model = artist_history::ActiveModel::from(&data);

    let new_artist = artist_active_model.insert(tx).await?;
    let new_artist_history = artist_history_active_model.insert(tx).await?;

    let new_correction = repository::correction::create_self_approval()
        .author_id(data.author_id)
        .entity_type(EntityType::Artist)
        .description(data.description.clone())
        .db(tx)
        .call()
        .await?;

    repository::correction::link_history(
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
        let (artist_link_models, artist_link_history_models): (Vec<_>, Vec<_>) =
            links
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

        artist_link::Entity::insert_many(artist_link_models)
            .exec(tx)
            .await?;

        artist_link_history::Entity::insert_many(artist_link_history_models)
            .exec(tx)
            .await?;
    }

    if let Some(members) = data.members {
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

    Ok(new_artist)
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

async fn create_update_correction(
    id: i32,
    data: GeneralArtistDto,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let mut artist_active_model = artist::ActiveModel::from(&data);

    let mut artist_history_active_model =
        artist_history::ActiveModel::from(&data);

    artist_active_model.id = Set(id);
    artist_history_active_model.id = Set(id);

    artist::Entity::update(artist_active_model).exec(tx).await?;
    let history = artist_history::Entity::update(artist_history_active_model)
        .exec(tx)
        .await?;

    let correction = repository::correction::create()
        .entity_type(EntityType::Artist)
        .description(data.description.clone())
        .author_id(data.author_id)
        .db(tx)
        .call()
        .await?;

    repository::correction::link_history(
        correction.id,
        history.id,
        data.description,
        tx,
    )
    .await?;

    if let Some(aliases) = data.aliases {
        create_artist_alias_history(history.id, &aliases, tx).await?;
    };

    // TODO
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

    if let Some(members) = data.members {
        if history.artist_type.is_unknown() {
            // TODO: Err
            return Err(DbErr::Custom(
                "Unknown artist type cannot have members".into(),
            ));
        }
        let (
            member_history_model,
            todo_roles_historys,
            todo_join_leaves_history,
        ): (Vec<_>, Vec<_>, Vec<_>) = members
            .into_iter()
            .map(|member| {
                let mut todo_roles_history = vec![];
                let mut todo_join_levaes_history = vec![];

                for role_id in member.roles {
                    todo_roles_history.push(
                        group_member_role_history::ActiveModel {
                            id: NotSet,
                            group_member_history_id: NotSet,
                            role_id: Set(role_id),
                        },
                    );
                }

                for (join_year, leave_year) in member.join_leave {
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
            .zip(todo_roles_historys.into_iter())
            .flat_map(|(history, roles)| {
                roles.into_iter().map(|mut active_model| {
                    active_model.group_member_history_id = Set(history.id);
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

        group_member_role_history::Entity::insert_many(role_history_models)
            .exec(tx)
            .await?;

        group_member_join_leave_history::Entity::insert_many(
            join_leave_history_models,
        )
        .exec(tx)
        .await?;
    };

    Ok(())
}
