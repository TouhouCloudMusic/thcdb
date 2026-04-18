use std::collections::{HashMap, HashSet};
use std::env;
use std::future::Future;

use entity::{user, user_role};
use sea_orm::ActiveValue::*;
use sea_orm::prelude::Expr;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseConnection, DbErr, EntityTrait,
    IntoActiveModel, PaginatorTrait, QueryFilter, QueryOrder, Select,
    TransactionTrait,
};

use crate::constant::ADMIN_USERNAME;
use crate::domain::model::UserRoleEnum;
use crate::domain::shared::{CursorResponse, PageResponse};
use crate::shared::http::{CorrectionSortField, PageQuery, PaginationQuery};
use crate::shared::secret::hash;

pub async fn correction_sorted_entity_ids(
    db: &impl ConnectionTrait,
    entity_type: entity::enums::EntityType,
    sort_field: CorrectionSortField,
    sort_direction: sea_orm::Order,
) -> Result<Vec<i32>, DbErr> {
    use entity::correction::Column;
    let sort_column = match sort_field {
        CorrectionSortField::CreatedAt => Column::CreatedAt,
        CorrectionSortField::HandledAt => Column::HandledAt,
    };

    let models: Vec<entity::correction::Model> =
        entity::correction::Entity::find()
            .filter(Column::EntityType.eq(entity_type))
            .order_by(sort_column, sort_direction.clone())
            .all(db)
            .await?;

    let entity_ids = if matches!(sort_direction, sea_orm::Order::Asc) {
        // models are sorted oldest -> newest, order entities by their last occurrence.
        let mut last_index: HashMap<i32, usize> = HashMap::new();
        for (index, m) in models.iter().enumerate() {
            last_index.insert(m.entity_id, index);
        }

        let mut entries: Vec<(i32, usize)> = last_index.into_iter().collect();
        entries.sort_by_key(|(_, index)| *index);
        entries.into_iter().map(|(id, _)| id).collect()
    } else {
        // models are sorted newest -> oldest (or custom field order),
        // pick the first correction per entity.
        let mut seen = HashSet::new();
        models
            .into_iter()
            .filter_map(|m| seen.insert(m.entity_id).then_some(m.entity_id))
            .collect()
    };

    Ok(entity_ids)
}

pub async fn upsert_admin_acc(db: &DatabaseConnection) {
    let admin_password = env::var("ADMIN_PASSWORD")
        .unwrap_or_else(|_| admin_password_fallback());
    let password = hash(&admin_password)
        .await
        .expect("Failed to hash ADMIN_PASSWORD");
    let admin_email = env::var("ADMIN_EMAIL")
        .ok()
        .map(|v| v.trim().to_lowercase())
        .filter(|v| !v.is_empty());
    let admin_email_placeholder = "admin@localhost".to_string();

    async {
        let tx = db.begin().await?;

        let admin_user = user::Entity::find()
            .filter(user::Column::Name.eq(ADMIN_USERNAME))
            .one(&tx)
            .await?;

        let admin_id = if let Some(admin_user) = admin_user {
            let mut update = user::Entity::update_many()
                .col_expr(user::Column::Password, Expr::value(password.clone()))
                .col_expr(user::Column::EmailVerified, Expr::value(true))
                .filter(user::Column::Id.eq(admin_user.id));

            if let Some(admin_email) = &admin_email {
                update = update.col_expr(
                    user::Column::Email,
                    Expr::value(admin_email.clone()),
                );
            }

            update.exec(&tx).await?;

            admin_user.id
        } else {
            let admin_email = admin_email
                .clone()
                .unwrap_or_else(|| admin_email_placeholder.clone());

            let res = user::Entity::insert(user::ActiveModel {
                id: NotSet,
                name: Set(ADMIN_USERNAME.to_string()),
                email: Set(admin_email),
                email_verified: Set(true),
                password: Set(password),
                avatar_id: Set(None),
                profile_banner_id: Set(None),
                last_login: Set(chrono::Local::now().into()),
                created_at: NotSet,
                bio: Set(None),
                settings: NotSet,
            })
            .exec_with_returning(&tx)
            .await?;

            res.id
        };

        user_role::Entity::insert(
            user_role::Model {
                user_id: admin_id,
                role_id: UserRoleEnum::Admin.into(),
            }
            .into_active_model(),
        )
        .on_conflict_do_nothing()
        .exec(&tx)
        .await?;

        tx.commit().await
    }
    .await
    .expect("Failed to upsert admin account");
}

fn admin_password_fallback() -> String {
    #[cfg(test)]
    {
        "changeme".to_string()
    }

    #[cfg(not(test))]
    {
        panic!("Env var ADMIN_PASSWORD is not set");
    }
}

pub fn sort_by_id_list<T>(
    mut items: Vec<T>,
    id_order: &[i32],
    get_id: impl Fn(&T) -> i32,
) -> Vec<T> {
    let id_to_index: HashMap<i32, usize> = id_order
        .iter()
        .enumerate()
        .map(|(index, &id)| (id, index))
        .collect();

    items.sort_by_key(|item| {
        id_to_index
            .get(&get_id(item))
            .copied()
            .unwrap_or(usize::MAX)
    });

    items
}

pub fn paginate_by_id<T>(
    items: Vec<T>,
    pagination: &PaginationQuery,
    get_id: impl Fn(&T) -> i32,
) -> CursorResponse<T> {
    let limit = pagination.limit() as usize;

    let items: Vec<T> = if let Some(cursor) = pagination.cursor {
        items
            .into_iter()
            .filter(|item| get_id(item) > cursor)
            .collect()
    } else {
        items
    };

    let has_next = items.len() > limit;
    let items: Vec<T> = items.into_iter().take(limit).collect();
    let next_cursor = if has_next {
        items.last().map(&get_id)
    } else {
        None
    };

    CursorResponse { items, next_cursor }
}

pub async fn find_many_paginated<E, D, Fut>(
    mut select: Select<E>,
    pagination: PaginationQuery,
    id_column: E::Column,
    fetch: impl FnOnce(Select<E>) -> Fut,
    get_id: impl Fn(&D) -> i32,
) -> Result<CursorResponse<D>, DbErr>
where
    E: EntityTrait,
    E::Column: ColumnTrait,
    Fut: Future<Output = Result<Vec<D>, DbErr>>,
{
    use sea_orm::{QueryFilter, QueryOrder, QuerySelect};

    let limit = pagination.limit();

    if let Some(cursor) = pagination.cursor {
        select = select.filter(id_column.gt(cursor));
    }

    // Ensure stable ordering for cursor pagination.
    select = select.order_by_asc(id_column);
    select = select.limit(u64::from(limit) + 1);

    let mut items = fetch(select).await?;

    let has_next = items.len() > limit as usize;
    if has_next {
        items.truncate(limit as usize);
    }

    let next_cursor = if has_next {
        items.last().map(&get_id)
    } else {
        None
    };

    Ok(CursorResponse { items, next_cursor })
}

pub async fn find_many_page<E, D, Fut>(
    db: &impl ConnectionTrait,
    mut select: Select<E>,
    pagination: PageQuery,
    id_column: E::Column,
    fetch: impl FnOnce(Select<E>) -> Fut,
) -> Result<PageResponse<D>, DbErr>
where
    E: EntityTrait,
    E::Model: sea_orm::FromQueryResult + Send + Sync + 'static,
    E::Column: ColumnTrait,
    Fut: Future<Output = Result<Vec<D>, DbErr>>,
{
    use sea_orm::{QueryOrder, QuerySelect};

    let total_items = select.clone().count(db).await?;

    // Ensure stable ordering for offset pagination.
    select = select.order_by_asc(id_column);

    select = select
        .offset(pagination.offset())
        .limit(u64::from(pagination.limit()));

    let items = fetch(select).await?;

    Ok(pagination.to_response(items, total_items))
}

pub fn page_from_items<T>(
    items: Vec<T>,
    pagination: &PageQuery,
) -> PageResponse<T> {
    let total_items = items.len() as u64;

    let start = usize::try_from(pagination.offset()).unwrap_or(usize::MAX);

    let items = if start >= items.len() {
        vec![]
    } else {
        items
            .into_iter()
            .skip(start)
            .take(usize::from(pagination.limit()))
            .collect()
    };

    pagination.to_response(items, total_items)
}
