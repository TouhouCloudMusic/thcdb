use serde::Serialize;
use utoipa::ToSchema;

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, strum::Display, Serialize, ToSchema,
)]
#[repr(i32)]
pub enum NotificationKindEnum {
    Unknown(i32),
    CommentReply = 1,
    CommentMention = 2,
    CommentModeration = 3,
    CorrectionApproved = 4,
    CorrectionRejected = 5,
    CorrectionNeedsReview = 6,
    CorrectionComment = 7,
    ImageApproved = 8,
    ImageRejected = 9,
    ImageReverted = 10,
    NewFollower = 11,
    FollowingActivity = 12,
}

impl From<NotificationKindEnum> for i32 {
    fn from(value: NotificationKindEnum) -> Self {
        match value {
            NotificationKindEnum::CommentReply => 1,
            NotificationKindEnum::CommentMention => 2,
            NotificationKindEnum::CommentModeration => 3,
            NotificationKindEnum::CorrectionApproved => 4,
            NotificationKindEnum::CorrectionRejected => 5,
            NotificationKindEnum::CorrectionNeedsReview => 6,
            NotificationKindEnum::CorrectionComment => 7,
            NotificationKindEnum::ImageApproved => 8,
            NotificationKindEnum::ImageRejected => 9,
            NotificationKindEnum::ImageReverted => 10,
            NotificationKindEnum::NewFollower => 11,
            NotificationKindEnum::FollowingActivity => 12,
            NotificationKindEnum::Unknown(value) => value,
        }
    }
}

impl From<i32> for NotificationKindEnum {
    fn from(value: i32) -> Self {
        match value {
            1 => NotificationKindEnum::CommentReply,
            2 => NotificationKindEnum::CommentMention,
            3 => NotificationKindEnum::CommentModeration,
            4 => NotificationKindEnum::CorrectionApproved,
            5 => NotificationKindEnum::CorrectionRejected,
            6 => NotificationKindEnum::CorrectionNeedsReview,
            7 => NotificationKindEnum::CorrectionComment,
            8 => NotificationKindEnum::ImageApproved,
            9 => NotificationKindEnum::ImageRejected,
            10 => NotificationKindEnum::ImageReverted,
            11 => NotificationKindEnum::NewFollower,
            12 => NotificationKindEnum::FollowingActivity,
            _ => NotificationKindEnum::Unknown(value),
        }
    }
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, strum::Display, Serialize, ToSchema,
)]
#[repr(i32)]
pub enum NotificationTargetTypeEnum {
    Unknown(i32),
    Comment = 1,
    Correction = 2,
    Image = 3,
    User = 4,
}

impl From<NotificationTargetTypeEnum> for i32 {
    fn from(value: NotificationTargetTypeEnum) -> Self {
        match value {
            NotificationTargetTypeEnum::Comment => 1,
            NotificationTargetTypeEnum::Correction => 2,
            NotificationTargetTypeEnum::Image => 3,
            NotificationTargetTypeEnum::User => 4,
            NotificationTargetTypeEnum::Unknown(value) => value,
        }
    }
}

impl From<i32> for NotificationTargetTypeEnum {
    fn from(value: i32) -> Self {
        match value {
            1 => NotificationTargetTypeEnum::Comment,
            2 => NotificationTargetTypeEnum::Correction,
            3 => NotificationTargetTypeEnum::Image,
            4 => NotificationTargetTypeEnum::User,
            _ => NotificationTargetTypeEnum::Unknown(value),
        }
    }
}
