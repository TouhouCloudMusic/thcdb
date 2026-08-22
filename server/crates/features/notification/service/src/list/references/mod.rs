use std::collections::{HashMap, HashSet};

use comment_repo::{CommentTarget, CommentTargetKind};
use entity::enums::EntityType;
use image_queue_core::ImageQueueTarget;
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::ConnectionTrait;
use user_core::{UserSummary, load_users};

use crate::Error;
use crate::model::{
    CollectionReference, EntityMeta, NotificationEntityKind,
    NotificationImageType,
};

mod queries;

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
#[repr(i16)]
pub(in crate::list) enum EntityNameKind {
    Artist,
    Label,
    Release,
    Song,
    Tag,
    Event,
    SongLyrics,
    CreditRole,
}

impl EntityNameKind {
    const fn name(self) -> &'static str {
        match self {
            Self::Artist => "artist",
            Self::Label => "label",
            Self::Release => "release",
            Self::Song => "song",
            Self::Tag => "tag",
            Self::Event => "event",
            Self::SongLyrics => "song lyrics",
            Self::CreditRole => "credit role",
        }
    }
}

impl From<EntityType> for EntityNameKind {
    fn from(entity_type: EntityType) -> Self {
        match entity_type {
            EntityType::Artist => Self::Artist,
            EntityType::Label => Self::Label,
            EntityType::Release => Self::Release,
            EntityType::Song => Self::Song,
            EntityType::Tag => Self::Tag,
            EntityType::Event => Self::Event,
            EntityType::SongLyrics => Self::SongLyrics,
            EntityType::CreditRole => Self::CreditRole,
        }
    }
}

enum CommentTargetReferenceKind {
    Entity {
        name_kind: EntityNameKind,
        entity_kind: NotificationEntityKind,
    },
    Correction,
    ImageQueue,
}

impl From<CommentTargetKind> for CommentTargetReferenceKind {
    fn from(kind: CommentTargetKind) -> Self {
        match kind {
            CommentTargetKind::Artist => Self::Entity {
                name_kind: EntityNameKind::Artist,
                entity_kind: NotificationEntityKind::Artist,
            },
            CommentTargetKind::Release => Self::Entity {
                name_kind: EntityNameKind::Release,
                entity_kind: NotificationEntityKind::Release,
            },
            CommentTargetKind::Song => Self::Entity {
                name_kind: EntityNameKind::Song,
                entity_kind: NotificationEntityKind::Song,
            },
            CommentTargetKind::Label => Self::Entity {
                name_kind: EntityNameKind::Label,
                entity_kind: NotificationEntityKind::Label,
            },
            CommentTargetKind::Event => Self::Entity {
                name_kind: EntityNameKind::Event,
                entity_kind: NotificationEntityKind::Event,
            },
            CommentTargetKind::Tag => Self::Entity {
                name_kind: EntityNameKind::Tag,
                entity_kind: NotificationEntityKind::Tag,
            },
            CommentTargetKind::Correction => Self::Correction,
            CommentTargetKind::ImageQueue => Self::ImageQueue,
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
pub(super) enum ReferenceKind {
    User,
    UserCollection,
    Correction,
    Comment,
    ImageQueue,
    CommentThread,
    Entity(EntityNameKind),
}

impl From<CommentTargetKind> for ReferenceKind {
    fn from(kind: CommentTargetKind) -> Self {
        match CommentTargetReferenceKind::from(kind) {
            CommentTargetReferenceKind::Entity { name_kind, .. } => {
                Self::Entity(name_kind)
            }
            CommentTargetReferenceKind::Correction => Self::Correction,
            CommentTargetReferenceKind::ImageQueue => Self::ImageQueue,
        }
    }
}

impl From<EntityType> for ReferenceKind {
    fn from(entity_type: EntityType) -> Self {
        Self::Entity(entity_type.into())
    }
}

#[derive(Default)]
pub(super) struct ReferenceIds(HashMap<ReferenceKind, HashSet<i32>>);

impl ReferenceIds {
    pub(super) fn insert(&mut self, kind: ReferenceKind, id: i32) {
        self.0.entry(kind).or_default().insert(id);
    }

    fn iter(
        &self,
        kind: ReferenceKind,
    ) -> impl Iterator<Item = i32> + Clone + '_ {
        self.0.get(&kind).into_iter().flatten().copied()
    }
}

impl Extend<(ReferenceKind, i32)> for ReferenceIds {
    fn extend<T>(&mut self, references: T)
    where
        T: IntoIterator<Item = (ReferenceKind, i32)>,
    {
        for (kind, id) in references {
            self.insert(kind, id);
        }
    }
}

pub(super) struct References {
    recipient_id: i32,
    users: HashMap<i32, UserSummary>,
    collections: HashMap<i32, queries::ReferencedUserCollection>,
    corrections: HashMap<i32, EntityMeta>,
    image_queues: HashMap<i32, ImageQueueMeta>,
    thread_containers: HashMap<i32, EntityMeta>,
    visible_comments: HashSet<i32>,
}

impl References {
    pub(super) async fn load(
        conn: &impl ConnectionTrait,
        recipient_id: i32,
        mut ids: ReferenceIds,
    ) -> Result<Self, Error> {
        let thread_targets = comment_repo::load_thread_targets(
            conn,
            ids.iter(ReferenceKind::CommentThread),
        )
        .await?;
        ids.extend(
            thread_targets.values().map(|target| {
                (ReferenceKind::from(target.kind()), target.id())
            }),
        );

        let correction_targets = queries::load_correction_targets(
            conn,
            ids.iter(ReferenceKind::Correction),
        )
        .await?;
        ids.extend(correction_targets.iter().map(|target| {
            (ReferenceKind::from(target.entity_type), target.entity_id)
        }));

        let entity_names = queries::load_entity_names(conn, &ids).await?;
        let image_queues: HashMap<i32, ImageQueueMeta> =
            image_queue_core::load_targets(
                conn,
                ids.iter(ReferenceKind::ImageQueue),
            )
            .await?
            .into_iter()
            .map(|(id, target)| (id, (id, target).into()))
            .collect();
        let users = load_users(conn, ids.iter(ReferenceKind::User))
            .await
            .db_operation("load notification users")?;
        let collections = queries::load_collections(
            conn,
            ids.iter(ReferenceKind::UserCollection),
        )
        .await?;
        let visible_comments = comment_repo::load_visible_comment_ids(
            conn,
            ids.iter(ReferenceKind::Comment),
        )
        .await?;

        let corrections =
            resolve_corrections(correction_targets, &entity_names)?;
        for id in ids.iter(ReferenceKind::Correction) {
            if !corrections.contains_key(&id) {
                return Err(DatabaseError::internal(format!(
                    "notification correction {id} has no target name"
                ))
                .into());
            }
        }
        for id in ids.iter(ReferenceKind::ImageQueue) {
            if !image_queues.contains_key(&id) {
                return Err(DatabaseError::internal(format!(
                    "notification image queue {id} has no target"
                ))
                .into());
            }
        }

        let thread_containers = thread_targets
            .into_iter()
            .map(|(thread_id, target)| {
                resolve_comment_target(
                    target,
                    &entity_names,
                    &corrections,
                    &image_queues,
                )
                .map(|container| (thread_id, container))
            })
            .collect::<Result<_, Error>>()?;

        Ok(Self {
            recipient_id,
            users,
            collections,
            corrections,
            image_queues,
            thread_containers,
            visible_comments,
        })
    }

    pub(super) fn user(&self, id: i32) -> UserSummary {
        self.users
            .get(&id)
            .cloned()
            .unwrap_or_else(|| UserSummary::unknown(id))
    }

    pub(super) fn correction_meta(&self, id: i32) -> EntityMeta {
        self.corrections
            .get(&id)
            .cloned()
            .expect("loaded notification correction must have metadata")
    }

    pub(super) fn collection_reference(
        &self,
        collection_id: Option<i32>,
    ) -> CollectionReference {
        let Some(id) = collection_id else {
            return CollectionReference::Deleted;
        };

        let Some(collection) = self.collections.get(&id) else {
            return CollectionReference::Deleted;
        };

        if collection.is_public || collection.user_id == self.recipient_id {
            CollectionReference::Available {
                id,
                title: collection.name.clone(),
            }
        } else {
            CollectionReference::Restricted
        }
    }

    pub(super) fn comment_thread_target(
        &self,
        thread_id: Option<i32>,
    ) -> Option<EntityMeta> {
        let id = thread_id?;
        Some(
            self.thread_containers.get(&id).cloned().expect(
                "loaded notification comment thread must have a target",
            ),
        )
    }

    pub(super) fn is_visible_comment(&self, id: i32) -> bool {
        self.visible_comments.contains(&id)
    }

    pub(super) fn image_queue_target(&self, id: i32) -> &ImageQueueMeta {
        self.image_queues
            .get(&id)
            .expect("loaded notification image queue must have a target")
    }
}

fn resolve_corrections(
    targets: Vec<queries::CorrectionTargetReference>,
    names: &queries::EntityNames,
) -> Result<HashMap<i32, EntityMeta>, Error> {
    targets
        .into_iter()
        .map(|target| {
            let name = names
                .get(target.entity_type.into(), target.entity_id)
                .ok_or_else(|| {
                DatabaseError::internal(format!(
                    "notification correction {} references missing {:?} {}",
                    target.correction_id, target.entity_type, target.entity_id
                ))
            })?;
            Ok((
                target.correction_id,
                EntityMeta {
                    kind: NotificationEntityKind::Correction,
                    id: target.correction_id,
                    name,
                },
            ))
        })
        .collect()
}

fn resolve_comment_target(
    target: CommentTarget,
    entity_names: &queries::EntityNames,
    corrections: &HashMap<i32, EntityMeta>,
    image_queues: &HashMap<i32, ImageQueueMeta>,
) -> Result<EntityMeta, Error> {
    let id = target.id();
    match CommentTargetReferenceKind::from(target.kind()) {
        CommentTargetReferenceKind::Entity {
            name_kind,
            entity_kind,
        } => {
            let name = entity_names.get(name_kind, id).ok_or_else(|| {
                DatabaseError::internal(format!(
                    "notification comment target references missing {} {id}",
                    name_kind.name()
                ))
            })?;
            Ok(EntityMeta {
                kind: entity_kind,
                id,
                name,
            })
        }
        CommentTargetReferenceKind::Correction => Ok(corrections
            .get(&id)
            .expect(
                "loaded notification comment correction target must have metadata",
            )
            .clone()),
        CommentTargetReferenceKind::ImageQueue => Ok(image_queues
            .get(&id)
            .expect(
                "loaded notification comment image queue target must have metadata",
            )
            .entity
            .clone()),
    }
}

#[derive(Clone)]
pub(super) struct ImageQueueMeta {
    pub(super) entity: EntityMeta,
    pub(super) image_type: NotificationImageType,
}

impl From<(i32, ImageQueueTarget)> for ImageQueueMeta {
    fn from((id, target): (i32, ImageQueueTarget)) -> Self {
        let (name, image_type) = match target {
            ImageQueueTarget::Artist {
                name, image_type, ..
            } => (name, image_type.into()),
            ImageQueueTarget::Release {
                title, image_type, ..
            } => (title, image_type.into()),
        };

        Self {
            entity: EntityMeta {
                kind: NotificationEntityKind::ImageQueue,
                id,
                name,
            },
            image_type,
        }
    }
}
