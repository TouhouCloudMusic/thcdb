pub use auth_creds::*;
mod auth_creds;
pub use user_role::*;
mod user_role;
#[expect(unused_imports)]
pub use verfication_code::*;

use crate::domain::user::User;
mod verfication_code;

pub struct CorrectionApprover(pub User);

impl CorrectionApprover {
    pub fn from_user(user: User) -> Option<Self> {
        user.has_roles(&[UserRoleEnum::Admin, UserRoleEnum::Moderator])
            .then_some(Self(user))
    }
}
