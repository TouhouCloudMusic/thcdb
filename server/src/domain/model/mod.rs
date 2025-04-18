pub mod image {

    use bon::Builder;

    #[derive(Builder, Clone, Debug)]
    pub struct NewImage {
        pub(in crate::domain) filename: String,
        pub(in crate::domain) uploaded_by: i32,
        pub(in crate::domain) directory: String,
    }
}

pub mod user;

pub mod auth {
    pub use auth_creds::*;
    mod auth_creds;
    pub use user_role::*;
    mod user_role;
    #[expect(unused_imports)]
    pub use verfication_code::*;
    mod verfication_code;
}
