use domain::shared::CursorResponse;
use entity::relation::ImageQueueRelationExt;
use entity::{image_queue, user};
use infra_db::SeaOrmRepository;
use sea_orm::{
    ColumnTrait, EntityTrait, JoinType, QueryFilter, QueryOrder, QuerySelect,
    QueryTrait, RelationTrait,
};

use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

pub(super) enum UserFilter {
    Id(i32),
    Name(String),
}

pub(super) async fn find_by_user(
    repo: &SeaOrmRepository,
    filter: UserFilter,
    limit: u8,
    cursor: Option<i32>,
) -> Result<CursorResponse<image_queue::Model>, DatabaseError> {
    let select = match filter {
        UserFilter::Id(user_id) => image_queue::Entity::find()
            .filter(image_queue::Column::CreatedBy.eq(user_id)),
        UserFilter::Name(name) => image_queue::Entity::find()
            .join(JoinType::InnerJoin, ImageQueueRelationExt::Creator.def())
            .filter(user::Column::Name.eq(name)),
    }
    .order_by_desc(image_queue::Column::Id)
    .apply_if(cursor, |query, cursor| {
        query.filter(image_queue::Column::Id.lt(cursor))
    });

    let mut models = select
        .limit(u64::from(limit) + 1)
        .all(&repo.conn)
        .await
        .db_operation("find user image queue")?;

    let has_next = models.len() > usize::from(limit);
    if has_next {
        models.truncate(usize::from(limit));
    }

    let next_cursor = if has_next {
        models.last().map(|model| model.id)
    } else {
        None
    };

    Ok(CursorResponse {
        items: models,
        next_cursor,
    })
}
