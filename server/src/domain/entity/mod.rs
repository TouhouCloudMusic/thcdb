pub mod image {

    use bon::Builder;

    #[derive(Builder, Clone, Debug)]
    pub struct NewImage {
        pub(in crate::domain) filename: String,
        pub(in crate::domain) uploaded_by: i32,
        pub(in crate::domain) directory: String,
    }
}
