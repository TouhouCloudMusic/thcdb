pub use api_error::*;
use proc_macro::TokenStream;
use quote::quote;
use syn::{DeriveInput, parse_macro_input};

mod api_error;

pub fn error_schema_impl(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let target_name = &input.ident;

    let expanded = quote! {
        impl ::utoipa::IntoResponses for #target_name {
            fn responses() -> ::std::collections::BTreeMap<
                ::std::string::String,
                ::utoipa::openapi::RefOr<utoipa::openapi::response::Response>,
            > {
                use crate::api_response::ErrResponseDef;
                Self::build_err_responses().into()
            }
        }
    };

    TokenStream::from(expanded)
}
