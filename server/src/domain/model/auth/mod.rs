pub use permission::*;
pub use user_role::*;
mod permission;
mod user_role;
#[expect(unused_imports)]
pub use verfication_code::*;

mod verfication_code;

use crate::domain::user::User;

pub struct CorrectionApprover(pub User);
