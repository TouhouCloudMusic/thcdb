mod credits;
mod relations;
mod releases;

pub use credits::{SongCredit, load_artist_credit_references};
use entity::{
    artist, release, release_track, song, song_artist, song_credit,
    song_language, song_link, song_localized_title, song_lyrics,
};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use itertools::izip;
pub use relations::{
    SongRelation, load_snapshot_relations, load_song_relations,
};
pub use releases::{
    SongRelease, load_release_cover_art_urls, load_release_track_positions,
};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, LoaderTrait, PaginatorTrait,
    QueryFilter, QueryOrder, QuerySelect, QueryTrait, Select,
};
use sea_query::extension::postgres::PgBinOper::{
    Similarity, SimilarityDistance,
};
use sea_query::{Expr, ExprTrait, Func};

#[infra_db::observe("song.exists")]
pub async fn exists(
    db: &impl ConnectionTrait,
    id: i32,
) -> Result<bool, DatabaseError> {
    Ok(song::Entity::find_by_id(id).exists(db).await?)
}

pub fn select_by_language_ids(
    language_ids: Option<Vec<i32>>,
) -> Select<song::Entity> {
    let select = song::Entity::find();
    let Some(language_ids) = language_ids else {
        return select;
    };
    let subquery = song_language::Entity::find()
        .select_only()
        .expr(1)
        .filter(Expr::eq(
            Expr::col((song_language::Entity, song_language::Column::SongId)),
            Expr::col((song::Entity, song::Column::Id)),
        ))
        .filter(song_language::Column::LanguageId.is_in(language_ids));

    select.filter(Expr::exists(subquery.as_query().clone()))
}

pub fn select_by_keyword(keyword: &str) -> Select<song::Entity> {
    let search_term = Func::lower(keyword);

    song::Entity::find()
        .filter(
            Func::lower(song::Column::Title.into_expr())
                .binary(Similarity, search_term.clone()),
        )
        .order_by_asc(
            Func::lower(song::Column::Title.into_expr())
                .binary(SimilarityDistance, search_term),
        )
}

pub struct SongDetailRows {
    pub song: song::Model,
    pub artists: Vec<artist::Model>,
    pub credits: Vec<song_credit::Model>,
    pub languages: Vec<song_language::Model>,
    pub localized_titles: Vec<song_localized_title::Model>,
    pub releases: Vec<release::Model>,
    pub lyrics: Vec<song_lyrics::Model>,
    pub links: Vec<song_link::Model>,
}

pub async fn load_detail_rows(
    select: Select<song::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<SongDetailRows>, DatabaseError> {
    let songs = select.all(db).await.db_context("load songs")?;
    if songs.is_empty() {
        return Ok(vec![]);
    }

    let (
        artists,
        credits,
        languages,
        localized_titles,
        releases,
        lyrics,
        links,
    ) = tokio::try_join!(
        songs.load_many_to_many(artist::Entity, song_artist::Entity, db),
        songs.load_many(song_credit::Entity, db),
        songs.load_many(song_language::Entity::find(), db),
        songs.load_many(song_localized_title::Entity, db),
        songs.load_many_to_many(release::Entity, release_track::Entity, db),
        songs.load_many(song_lyrics::Entity, db),
        songs.load_many(song_link::Entity, db),
    )
    .db_context("load song associations")?;

    Ok(izip!(
        songs,
        artists,
        credits,
        languages,
        localized_titles,
        releases,
        lyrics,
        links,
    )
    .map(
        |(
            song,
            artists,
            credits,
            languages,
            localized_titles,
            releases,
            lyrics,
            links,
        )| {
            SongDetailRows {
                song,
                artists,
                credits,
                languages,
                localized_titles,
                releases,
                lyrics,
                links,
            }
        },
    )
    .collect())
}
