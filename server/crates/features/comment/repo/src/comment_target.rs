use entity::{
    artist, comment_target, correction, event, image_queue, label, release,
    song, tag,
};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, IntoActiveModel, PaginatorTrait,
    QueryFilter,
};
use sea_query::OnConflict;

#[derive(Clone, Copy, Debug, PartialEq, Eq, strum::EnumIter)]
pub enum CommentTargetKind {
    Artist,
    Release,
    Song,
    Label,
    Event,
    Tag,
    Correction,
    ImageQueue,
}

impl CommentTargetKind {
    pub const fn entity_name(self) -> &'static str {
        match self {
            Self::Artist => "Artist",
            Self::Release => "Release",
            Self::Song => "Song",
            Self::Label => "Label",
            Self::Event => "Event",
            Self::Tag => "Tag",
            Self::Correction => "Correction",
            Self::ImageQueue => "Image queue",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct CommentTarget {
    kind: CommentTargetKind,
    id: i32,
}

impl From<&comment_target::Model> for CommentTarget {
    fn from(model: &comment_target::Model) -> Self {
        let target_id = model.id;
        let mut targets = [
            model.artist_id.map(|id| (CommentTargetKind::Artist, id)),
            model.release_id.map(|id| (CommentTargetKind::Release, id)),
            model.song_id.map(|id| (CommentTargetKind::Song, id)),
            model.label_id.map(|id| (CommentTargetKind::Label, id)),
            model.event_id.map(|id| (CommentTargetKind::Event, id)),
            model.tag_id.map(|id| (CommentTargetKind::Tag, id)),
            model
                .correction_id
                .map(|id| (CommentTargetKind::Correction, id)),
            model
                .image_queue_id
                .map(|id| (CommentTargetKind::ImageQueue, id)),
        ]
        .into_iter()
        .flatten();

        let (kind, id) = targets.next().expect(
            "comment target reference must reference exactly one target",
        );
        assert!(
            targets.next().is_none(),
            "comment target reference #{target_id} must reference exactly one target"
        );

        Self { kind, id }
    }
}

impl CommentTarget {
    pub async fn find(
        conn: &impl ConnectionTrait,
        kind: CommentTargetKind,
        id: i32,
    ) -> Result<Option<Self>, DatabaseError> {
        let exists = match kind {
            CommentTargetKind::Artist => artist::Entity::find_by_id(id)
                .exists(conn)
                .await
                .db_operation("check comment artist target exists")?,
            CommentTargetKind::Release => release::Entity::find_by_id(id)
                .exists(conn)
                .await
                .db_operation("check comment release target exists")?,
            CommentTargetKind::Song => song::Entity::find_by_id(id)
                .exists(conn)
                .await
                .db_operation("check comment song target exists")?,
            CommentTargetKind::Label => label::Entity::find_by_id(id)
                .exists(conn)
                .await
                .db_operation("check comment label target exists")?,
            CommentTargetKind::Event => event::Entity::find_by_id(id)
                .exists(conn)
                .await
                .db_operation("check comment event target exists")?,
            CommentTargetKind::Tag => tag::Entity::find_by_id(id)
                .exists(conn)
                .await
                .db_operation("check comment tag target exists")?,
            CommentTargetKind::Correction => correction::Entity::find_by_id(id)
                .exists(conn)
                .await
                .db_operation("check comment correction target exists")?,
            CommentTargetKind::ImageQueue => {
                image_queue::Entity::find_by_id(id)
                    .exists(conn)
                    .await
                    .db_operation("check comment image queue target exists")?
            }
        };

        Ok(exists.then_some(Self { kind, id }))
    }

    pub const fn kind(self) -> CommentTargetKind {
        self.kind
    }

    pub const fn id(self) -> i32 {
        self.id
    }

    const fn column(self) -> comment_target::Column {
        match self.kind {
            CommentTargetKind::Artist => comment_target::Column::ArtistId,
            CommentTargetKind::Release => comment_target::Column::ReleaseId,
            CommentTargetKind::Song => comment_target::Column::SongId,
            CommentTargetKind::Label => comment_target::Column::LabelId,
            CommentTargetKind::Event => comment_target::Column::EventId,
            CommentTargetKind::Tag => comment_target::Column::TagId,
            CommentTargetKind::Correction => {
                comment_target::Column::CorrectionId
            }
            CommentTargetKind::ImageQueue => {
                comment_target::Column::ImageQueueId
            }
        }
    }
}

impl IntoActiveModel<comment_target::ActiveModel> for CommentTarget {
    fn into_active_model(self) -> comment_target::ActiveModel {
        let mut target = comment_target::ActiveModel {
            id: NotSet,
            ..Default::default()
        };

        match self.kind {
            CommentTargetKind::Artist => target.artist_id = Set(Some(self.id)),
            CommentTargetKind::Release => {
                target.release_id = Set(Some(self.id));
            }
            CommentTargetKind::Song => target.song_id = Set(Some(self.id)),
            CommentTargetKind::Label => target.label_id = Set(Some(self.id)),
            CommentTargetKind::Event => target.event_id = Set(Some(self.id)),
            CommentTargetKind::Tag => target.tag_id = Set(Some(self.id)),
            CommentTargetKind::Correction => {
                target.correction_id = Set(Some(self.id));
            }
            CommentTargetKind::ImageQueue => {
                target.image_queue_id = Set(Some(self.id));
            }
        }

        target
    }
}

pub(crate) async fn find_target(
    conn: &impl ConnectionTrait,
    target: CommentTarget,
) -> Result<Option<comment_target::Model>, DatabaseError> {
    comment_target::Entity::find()
        .filter(target.column().eq(target.id))
        .one(conn)
        .await
        .db_operation("find comment target reference")
}

pub(crate) async fn get_or_create_target(
    conn: &impl ConnectionTrait,
    target: CommentTarget,
) -> Result<comment_target::Model, DatabaseError> {
    let target_column = target.column();
    let mut inserted =
        comment_target::Entity::insert(target.into_active_model())
            .on_conflict(
                OnConflict::column(target_column).do_nothing().to_owned(),
            )
            .exec_with_returning_many(conn)
            .await
            .db_operation("create comment target reference")?;

    if let Some(target) = inserted.pop() {
        return Ok(target);
    }

    find_target(conn, target)
        .await?
        .ok_or_else(|| {
            DatabaseError::internal(format!(
                "comment target reference for {:?} #{} missing after insert conflict",
                target.kind, target.id,
            ))
        })
}
