use axum::extract::{Path, Query, State};
use domain::shared::PageResponse;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::{PageQuery, TagEntitySort, TagFilter};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::features::tag::list::TagListItem;
use crate::features::tag::model::Tag;
use crate::features::tag_vote::EntityType;
use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::{Data, Error as ApiError};

const TAG: &str = "Tag";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(find_tag_by_id))
                .routes(routes!(find_tag_entities))
                .routes(routes!(find_tag_by_keyword))
                .routes(routes!(explore_tag))
        })
        .finish()
}

data! {
    DataOptionTag, Option<Tag>
    DataVecTag, Vec<Tag>
    DataPageTag, PageResponse<TagListItem>
    DataTagEntitiesPage, super::repo::TagEntitiesPage
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/tag/{id}",
    responses(
        (status = 200, body = DataOptionTag),
    ),
)]
async fn find_tag_by_id(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
) -> Result<Data<Option<Tag>>, DatabaseError> {
    super::repo::find_by_id(&repo, id).await.map(Data::from)
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/tag/{id}/entities",
    params(EntityQuery, PageQuery),
    responses(
        (status = 200, body = DataTagEntitiesPage),
        ApiError,
    ),
)]
async fn find_tag_entities(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
    Query(query): Query<EntityQuery>,
    Query(pagination): Query<PageQuery>,
) -> Result<Data<super::repo::TagEntitiesPage>, DatabaseError> {
    use super::repo::TagEntitiesPage;

    let page = match query {
        EntityQuery::Artist {
            sort_by: ArtistSort::Popular,
        } => TagEntitiesPage::Artist(
            super::repo::find_artists(&repo, id, pagination).await?,
        ),
        EntityQuery::Release { sort_by: sort } => TagEntitiesPage::Release(
            super::repo::find_releases(&repo, id, sort, pagination).await?,
        ),
        EntityQuery::Song { sort_by: sort } => TagEntitiesPage::Song(
            super::repo::find_songs(&repo, id, sort, pagination).await?,
        ),
    };

    Ok(Data::from(page))
}

#[derive(Deserialize)]
#[serde(tag = "entity_type", rename_all = "snake_case")]
enum EntityQuery {
    Artist {
        #[serde(default)]
        sort_by: ArtistSort,
    },
    Release {
        #[serde(default)]
        sort_by: TagEntitySort,
    },
    Song {
        #[serde(default)]
        sort_by: TagEntitySort,
    },
}

// WAIT: upstream hey api fix
impl IntoParams for EntityQuery {
    fn into_params(
        _: impl Fn() -> Option<utoipa::openapi::path::ParameterIn>,
    ) -> Vec<utoipa::openapi::path::Parameter> {
        use utoipa::PartialSchema;
        use utoipa::openapi::Required;
        use utoipa::openapi::path::{ParameterBuilder, ParameterIn};

        vec![
            ParameterBuilder::new()
                .name("entity_type")
                .parameter_in(ParameterIn::Query)
                .required(Required::True)
                .schema(Some(EntityType::schema()))
                .build(),
            ParameterBuilder::new()
                .name("sort_by")
                .parameter_in(ParameterIn::Query)
                .required(Required::False)
                .description(Some(
                    "Defaults to popular. Release-date sorting is available for releases and songs.",
                ))
                .schema(Some(Option::<TagEntitySort>::schema()))
                .build(),
        ]
    }
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "snake_case")]
enum ArtistSort {
    #[default]
    Popular,
}

#[derive(IntoParams, Deserialize)]
struct KwArgs {
    keyword: String,
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/tag",
    params(KwArgs),
    responses(
        (status = 200, body = DataVecTag),
    ),
)]
async fn find_tag_by_keyword(
    State(repo): State<state::SeaOrmRepository>,
    Query(query): Query<KwArgs>,
) -> Result<Data<Vec<Tag>>, DatabaseError> {
    super::repo::find_by_keyword(&repo, &query.keyword)
        .await
        .map(Data::from)
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/tag/explore",
    params(TagFilter, PageQuery),
    responses(
        (status = 200, body = DataPageTag),
        ApiError,
    ),
)]
async fn explore_tag(
    State(repo): State<state::SeaOrmRepository>,
    Query(filter): Query<TagFilter>,
    Query(pagination): Query<PageQuery>,
) -> Result<Data<PageResponse<TagListItem>>, DatabaseError> {
    let normalized = filter.with_sort_defaults();
    log::info!(
        target: "features.tag.find.http",
        normalized:? = normalized;
        "incoming explore query"
    );
    super::repo::find_by_filter(&repo, normalized, pagination)
        .await
        .map(Data::from)
}
