use axum::http::StatusCode;
use chrono::Utc;
use collection_ext::Intersection;
use derive_more::Display;
pub use entity::sea_orm_active_enums::ImageQueueStatus;
use itertools::Itertools;
use macros::{ApiError, AutoMapper};
use sea_orm::prelude::DateTimeWithTimeZone;
use thiserror::Error;

use crate::domain::image::Image;
use crate::domain::model::auth::UserRoleEnum;
use crate::domain::user::User;

#[derive(Debug, Clone, Copy, Display, Error, ApiError)]
pub enum Error {
    #[display("Invalid operation")]
    #[api_error(
        status_code = StatusCode::BAD_REQUEST,
    )]
    InvalidOperation,
    #[display("Permission denied")]
    #[api_error(
        status_code = StatusCode::FORBIDDEN,
    )]
    PermissionDenied,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum ImageQueueActionEnum {
    Approve,
    Reject,
    Revert,
    Cancel,
}

impl ImageQueueActionEnum {
    #[expect(clippy::unused_self, reason = "maybe needed in future")]
    const fn required_roles(self) -> &'static [UserRoleEnum] {
        &[UserRoleEnum::Admin, UserRoleEnum::Moderator]
    }
}

#[derive(Debug, Clone, Copy, AutoMapper)]
#[mapper(from(entity::image_queue::Model), into(entity::image_queue::Model))]
pub struct ImageQueue {
    pub id: i32,
    pub image_id: Option<i32>,
    pub status: ImageQueueStatus,
    pub handled_at: Option<DateTimeWithTimeZone>,
    pub handled_by: Option<i32>,
    pub reverted_at: Option<DateTimeWithTimeZone>,
    pub reverted_by: Option<i32>,
    pub created_at: DateTimeWithTimeZone,
    pub creaded_by: i32,
}

impl ImageQueue {
    pub fn approve(mut self, user: &User) -> Result<Self, Error> {
        self.validate_action(ImageQueueActionEnum::Approve, user)?;

        self.status = ImageQueueStatus::Approved;
        self.handled_at = Some(Utc::now().into());
        self.handled_by = Some(user.id);
        Ok(self)
    }
    pub fn cancel(mut self, user: &User) -> Result<Self, Error> {
        self.validate_action(ImageQueueActionEnum::Cancel, user)?;

        self.status = ImageQueueStatus::Cancelled;
        self.handled_at = Some(Utc::now().into());
        self.handled_by = Some(user.id);
        Ok(self)
    }
    pub fn reject(mut self, user: &User) -> Result<Self, Error> {
        self.validate_action(ImageQueueActionEnum::Reject, user)?;

        self.status = ImageQueueStatus::Rejected;
        self.handled_at = Some(Utc::now().into());
        self.handled_by = Some(user.id);
        Ok(self)
    }
    pub fn revert(mut self, user: &User) -> Result<Self, Error> {
        self.validate_action(ImageQueueActionEnum::Revert, user)?;

        self.status = ImageQueueStatus::Reverted;
        self.reverted_at = Some(Utc::now().into());
        self.reverted_by = Some(user.id);
        Ok(self)
    }
}

impl ImageQueue {
    fn validate_action(
        &self,
        action: ImageQueueActionEnum,
        user: &User,
    ) -> Result<(), Error> {
        use ImageQueueActionEnum::*;
        // Approve, cancel and reject are allowed only when status is pending
        if let Approve | Cancel | Reject = action
            && self.status != ImageQueueStatus::Pending
        {
            return Err(Error::InvalidOperation);
        }

        let user_roles = user
            .roles
            .iter()
            .map(|role| UserRoleEnum::try_from(role.id).unwrap())
            .collect_vec();
        let required_roles = action.required_roles();
        // Users also can cancel their image uploads
        let has_permission = user_roles.intersects(&required_roles)
            || action == ImageQueueActionEnum::Cancel
                && user.id == self.creaded_by;

        has_permission.ok_or(Error::PermissionDenied)
    }
}

#[derive(Debug, Clone, Copy)]
pub struct NewImageQueue {
    pub image_id: i32,
    pub creaded_by: i32,
}

impl NewImageQueue {
    pub const fn new(user: &User, image: &Image) -> Self {
        Self {
            image_id: image.id,
            creaded_by: user.id,
        }
    }
}

// macro_rules! def_image_queue {
//     ($(
//         $name:ident { $($field:ident : $type:ty),* $(,)? }
//     ),* $(,)?) => {$(
//         #[derive(Debug, Clone, Copy)]
//         #[allow(clippy::allow_attributes, clippy::struct_field_names)]
//         struct $name {
//             $($field: $type),*,
//             created_by: i32,
//         }
//     )*};
// }

// def_image_queue!(
//     Pending { image_id: i32 },
//     Approved {
//         image_id: i32,
//         handled_at: DateTimeWithTimeZone,
//         handled_by: i32
//     },
//     Reverted {
//         image_id: i32,
//         handled_at: DateTimeWithTimeZone,
//         handled_by: i32,
//         reverted_at: DateTimeWithTimeZone,
//         reverted_by: i32
//     },
//     Rejected {
//         handled_at: DateTimeWithTimeZone,
//         handled_by: i32
//     },
//     Cancelled {
//         handled_at: DateTimeWithTimeZone,
//         handled_by: i32
//     },
// );

// pub trait ImageQueueAction {
//     fn approve(self, user: &User) -> Self;
//     fn cancel(self, user: &User) -> Self;
//     fn reject(self, user: &User) -> Self;
//     fn revert(self, user: &User) -> Self;
// }

// #[derive(Debug, Clone, Copy)]
// // #[delegate(ImageQueueGetter)]
// pub enum ImageQueueEnum {
//     Pending(Pending),
//     Approved(Approved),
//     Reverted(Reverted),
//     Rejected(Rejected),
//     Cancelled(Cancelled),
// }

// impl ImageQueueGetter for Pending {
//     fn id(&self) -> i32 {
//         self.id
//     }

//     fn status(&self) -> ImageQueueStatus {
//         ImageQueueStatus::Pending
//     }

//     fn image_id(&self) -> Option<i32> {
//         Some(self.image_id)
//     }

//     fn handled_at(&self) -> Option<DateTimeWithTimeZone> {
//         None
//     }

//     fn handled_by(&self) -> Option<i32> {
//         None
//     }

//     fn reverted_at(&self) -> Option<DateTimeWithTimeZone> {
//         None
//     }

//     fn reverted_by(&self) -> Option<i32> {
//         None
//     }

//     fn created_at(&self) -> DateTimeWithTimeZone {
//         self.created_at
//     }

//     fn created_by(&self) -> i32 {
//         self.created_by
//     }
// }

// impl ImageQueueGetter for Approved {
//     fn id(&self) -> i32 {
//         self.id
//     }

//     fn status(&self) -> ImageQueueStatus {
//         ImageQueueStatus::Approved
//     }

//     fn image_id(&self) -> Option<i32> {
//         Some(self.image_id)
//     }

//     fn handled_at(&self) -> Option<DateTimeWithTimeZone> {
//         Some(self.handled_at)
//     }

//     fn handled_by(&self) -> Option<i32> {
//         Some(self.handled_by)
//     }

//     fn reverted_at(&self) -> Option<DateTimeWithTimeZone> {
//         None
//     }

//     fn reverted_by(&self) -> Option<i32> {
//         None
//     }

//     fn created_at(&self) -> DateTimeWithTimeZone {
//         self.created_at
//     }

//     fn created_by(&self) -> i32 {
//         self.created_by
//     }
// }

// impl ImageQueueGetter for Rejected {
//     fn id(&self) -> i32 {
//         self.id
//     }

//     fn status(&self) -> ImageQueueStatus {
//         ImageQueueStatus::Rejected
//     }

//     fn image_id(&self) -> Option<i32> {
//         None
//     }

//     fn handled_at(&self) -> Option<DateTimeWithTimeZone> {
//         Some(self.handled_at)
//     }

//     fn handled_by(&self) -> Option<i32> {
//         Some(self.handled_by)
//     }

//     fn reverted_at(&self) -> Option<DateTimeWithTimeZone> {
//         None
//     }

//     fn reverted_by(&self) -> Option<i32> {
//         None
//     }

//     fn created_at(&self) -> DateTimeWithTimeZone {
//         self.created_at
//     }

//     fn created_by(&self) -> i32 {
//         self.created_by
//     }
// }

// impl ImageQueueGetter for Reverted {
//     fn id(&self) -> i32 {
//         self.id
//     }

//     fn status(&self) -> ImageQueueStatus {
//         ImageQueueStatus::Reverted
//     }

//     fn image_id(&self) -> Option<i32> {
//         Some(self.image_id)
//     }

//     fn handled_at(&self) -> Option<DateTimeWithTimeZone> {
//         Some(self.handled_at)
//     }

//     fn handled_by(&self) -> Option<i32> {
//         Some(self.handled_by)
//     }

//     fn reverted_at(&self) -> Option<DateTimeWithTimeZone> {
//         Some(self.reverted_at)
//     }

//     fn reverted_by(&self) -> Option<i32> {
//         Some(self.reverted_by)
//     }

//     fn created_at(&self) -> DateTimeWithTimeZone {
//         self.created_at
//     }

//     fn created_by(&self) -> i32 {
//         self.created_by
//     }
// }

// impl ImageQueueGetter for Cancelled {
//     fn id(&self) -> i32 {
//         self.id
//     }

//     fn status(&self) -> ImageQueueStatus {
//         ImageQueueStatus::Cancelled
//     }

//     fn image_id(&self) -> Option<i32> {
//         None
//     }

//     fn handled_at(&self) -> Option<DateTimeWithTimeZone> {
//         Some(self.handled_at)
//     }

//     fn handled_by(&self) -> Option<i32> {
//         Some(self.handled_by)
//     }

//     fn reverted_at(&self) -> Option<DateTimeWithTimeZone> {
//         None
//     }

//     fn reverted_by(&self) -> Option<i32> {
//         None
//     }

//     fn created_at(&self) -> DateTimeWithTimeZone {
//         self.created_at
//     }

//     fn created_by(&self) -> i32 {
//         self.created_by
//     }
// }
