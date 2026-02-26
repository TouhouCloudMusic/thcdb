pub use permission::*;
pub use user_role::*;
mod permission;
mod user_role;
pub use verification_code::*;

mod verification_code;

use crate::domain::user::User;

pub struct CorrectionApprover(pub User);
