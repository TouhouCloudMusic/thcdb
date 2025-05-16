use derive_more::From;
use entity::sea_orm_active_enums::ArtistType;
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
    ModelTrait, QueryFilter, QueryOrder,
};

use crate::domain::share::model::NewLocalizedName;
use crate::error::ServiceError;
use crate::utils::{Pipe, Reverse};

error_set! {
    #[derive(ApiError, From)]
    Error = {
        #[from(DbErr)]
        General(ServiceError)
    };

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
