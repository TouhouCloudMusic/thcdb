use std::collections::HashMap;
use std::path::PathBuf;

use chrono::NaiveDate;
use entity::enums::{ArtistType, DatePrecision};
use entity::sea_orm_active_enums::{ArtistImageType, EntityType};
use entity::{
    artist_alias, artist_alias_history, artist_image, artist_link,
    artist_link_history, artist_localized_name, artist_localized_name_history,
    artist_membership, artist_membership_history, artist_membership_role,
    artist_membership_role_history, artist_membership_tenure,
    artist_membership_tenure_history, credit_role, image, language,
};
use futures_util::try_join;
use itertools::{Itertools, izip};
use sea_orm::ActiveValue::{self, NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait,
    DatabaseTransaction, DbErr, EntityTrait, FromQueryResult, LoaderTrait,
    QueryFilter, TryInsertResult,
};
use sea_orm_migration::prelude::IntoCondition;
use url::Url;

use super::SeaOrmTxRepo;
use crate::domain::artist::model::{
    Artist, Membership, NewArtist, NewMembership, Tenure,
};
use crate::domain::artist::repository::{Repo, TxRepo};
use crate::domain::correction::NewCorrection;
use crate::domain::repository::Connection;
use crate::domain::share::model::{
    CreditRole, DateWithPrecision, EntityIdent, LocalizedName, Location,
    NewLocalizedName,
};
use crate::repo;

impl<T> Repo for T
where
    T: Connection<Error = DbErr>,
    T::Conn: ConnectionTrait,
{
    async fn find_by_id(&self, id: i32) -> Result<Option<Artist>, Self::Error> {
        find_many_impl(entity::artist::Column::Id.eq(id), self.conn())
            .await
            .map(|x| x.into_iter().next())
    }

    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Vec<Artist>, Self::Error> {
        find_many_impl(entity::artist::Column::Name.eq(name), self.conn()).await
    }
}

#[derive(FromQueryResult)]
struct ArtistImage {
    artist_id: i32,
    #[sea_orm(nested)]
    image: image::Model,
    r#type: ArtistImageType,
}

#[expect(clippy::too_many_lines, reason = "TODO")]
async fn find_many_impl(
    cond: impl IntoCondition,
    db: &impl ConnectionTrait,
) -> Result<Vec<Artist>, DbErr> {
    let artists = entity::artist::Entity::find().filter(cond).all(db).await?;

    let ids = artists.iter().map(|x| x.id).unique().collect_vec();
    let aliases = artist_alias::Entity::find()
        .filter(
            Condition::any()
                .add(artist_alias::Column::FirstId.is_in(ids.iter().copied()))
                .add(artist_alias::Column::SecondId.is_in(ids.iter().copied())),
        )
        .all(db)
        .await?;

    let artist_images = artist_image::Entity::find()
        .filter(artist_image::Column::ArtistId.is_in(ids.clone()))
        .left_join(image::Entity)
        .into_model::<ArtistImage>()
        .all(db)
        .await?;

    let mut images_map: HashMap<i32, Vec<_>> = artist_images.into_iter().fold(
        HashMap::new(),
        |mut acc, artist_image| {
            acc.entry(artist_image.artist_id)
                .or_default()
                .push(artist_image);
            acc
        },
    );

    let (artists, images): (Vec<_>, Vec<_>) = artists
        .into_iter()
        .map(|artist| {
            let artist_images =
                images_map.remove(&artist.id).unwrap_or_default();
            (artist, artist_images)
        })
        .unzip();

    let links = artists.load_many(artist_link::Entity, db).await?;

    let localized_names =
        artists.load_many(artist_localized_name::Entity, db).await?;

    let artist_memberships = artist_membership::Entity::find()
        .filter(
            Condition::any()
                .add(
                    artist_membership::Column::MemberId
                        .is_in(ids.iter().copied()),
                )
                .add(artist_membership::Column::GroupId.is_in(ids)),
        )
        .all(db)
        .await?;

    let roles = artist_memberships
        .load_many_to_many(
            credit_role::Entity,
            artist_membership_role::Entity,
            db,
        )
        .await?;

    let join_leaves = artist_memberships
        .load_many(artist_membership_tenure::Entity, db)
        .await?;

    let group_association =
        izip!(artist_memberships, roles, join_leaves).collect_vec();

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

    let ret = izip!(artists, links, localized_names, images)
        .map(|(artist, links, localized_names, image)| {
            let start_date =
                match (artist.start_date, artist.start_date_precision) {
                    (Some(date), Some(precision)) => {
                        Some((date, precision).into())
                    }
                    _ => None,
                };

            let end_date = match (artist.end_date, artist.end_date_precision) {
                (Some(date), Some(precision)) => Some((date, precision).into()),
                _ => None,
            };

            let aliases = aliases
                .iter()
                .filter(|x| x.first_id == artist.id || x.second_id == artist.id)
                .map(|x| {
                    if x.first_id == artist.id {
                        x.second_id
                    } else {
                        x.first_id
                    }
                })
                .collect();

            let localized_names = localized_names
                .into_iter()
                .map(|model| LocalizedName {
                    name: model.name,
                    language: langs
                        .iter()
                        .find(|y| y.id == model.language_id)
                        .unwrap()
                        .clone()
                        .into(),
                })
                .collect();

            let memberships = group_association
                .iter()
                .filter(|(model, _, _)| {
                    if artist.artist_type.is_solo() {
                        model.member_id == artist.id
                    } else {
                        model.group_id == artist.id
                    }
                })
                .map(|(model, role, tenure)| {
                    let artist_id = if artist.artist_type.is_solo() {
                        model.group_id
                    } else {
                        model.member_id
                    };

                    let tenure = tenure
                        .iter()
                        .sorted_by_key(|x| x.id)
                        .map_into::<Tenure>()
                        .collect_vec();

                    Membership {
                        artist_id,
                        roles: role
                            .iter()
                            .map(|x| CreditRole {
                                id: x.id,
                                name: x.name.clone(),
                            })
                            .collect_vec(),
                        tenure,
                    }
                })
                .collect();

            let profile_image_url = image
                .iter()
                .find(|x| x.r#type == ArtistImageType::Profile)
                .map(|x| {
                    let image = &x.image;
                    PathBuf::from_iter([&image.directory, &image.filename])
                        .to_string_lossy()
                        .to_string()
                });

            Artist {
                id: artist.id,
                name: artist.name,
                artist_type: artist.artist_type,
                text_aliases: artist.text_alias,
                start_date,
                end_date,

                aliases,
                links: links.into_iter().map(|x| x.url).collect_vec(),
                localized_names,
                start_location: Location {
                    country: artist.start_location_country,
                    province: artist.start_location_province,
                    city: artist.start_location_city,
                },
                current_location: Location {
                    country: artist.current_location_country,
                    province: artist.current_location_province,
                    city: artist.current_location_city,
                },
                memberships,
                profile_image_url,
            }
        })
        .collect_vec();

    Ok(ret)
}

impl TxRepo for SeaOrmTxRepo {
    async fn create(
        &self,
        correction: NewCorrection<NewArtist>,
    ) -> Result<i32, Self::Error> {
        let data = correction.data;
        let artist = save_artist_and_relations(&data, self.conn()).await?;

        let history =
            save_artist_history_and_relations(&data, self.conn()).await?;

        repo::correction::create_self_approval()
            .author_id(correction.author.id)
            .entity_type(EntityType::Artist)
            .entity_id(artist.id)
            .history_id(history.id)
            .description(correction.description)
            .call(self.conn())
            .await?;

        Ok(artist.id)
    }

    async fn create_history(
        &self,
        correction: &NewCorrection<NewArtist>,
    ) -> Result<i32, Self::Error> {
        save_artist_history_and_relations(&correction.data, self.conn())
            .await
            .map(|x| x.id)
    }
}

async fn save_artist_and_relations(
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
        create_artist_link(artist.id, data.links.clone(), conn),
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

async fn save_artist_history_and_relations(
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
        create_artist_link_history(artist_history.id, data.links.clone(), conn),
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
    links: Option<Vec<Url>>,
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
    artist_id: i32,
    links: Option<Vec<Url>>,
    db: &impl ConnectionTrait,
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
    artist_id: i32,
    localized_names: Option<&[NewLocalizedName]>,
    db: &impl ConnectionTrait,
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

async fn create_artist_artist_membership(
    artist_id: i32,
    artist_type: ArtistType,
    members: Option<&[NewMembership]>,
    db: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    if let Some(members) = members {
        let (artist_membership_model, todo_roles, todo_tenures): (
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

                let todo_tenure = member.tenure.clone().into_iter().map(
                    |Tenure {
                         join_year,
                         leave_year,
                     }| {
                        artist_membership_tenure::ActiveModel {
                            id: NotSet,
                            membership_id: NotSet,
                            join_year: Set(join_year),
                            leave_year: Set(leave_year),
                        }
                    },
                );

                (artist_membership_model, todo_roles, todo_tenure)
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
            .zip(todo_tenures.into_iter())
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

async fn create_artist_artist_membership_history(
    history_id: i32,
    members: Option<&[NewMembership]>,
    db: &DatabaseTransaction,
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
                    member.tenure.clone().into_iter().map(
                        |Tenure {
                             join_year,
                             leave_year,
                         }| {
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
