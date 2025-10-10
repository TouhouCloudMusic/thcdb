pub use api_error::*;
use proc_macro::TokenStream;
use quote::quote;
use syn::{DeriveInput, parse_macro_input};

mod api_error;

pub fn error_schema_impl(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let target_name = &input.ident;

    let (impl_generics, ty_generics, where_clause) =
        input.generics.split_for_impl();

    let expanded = quote! {
        impl #impl_generics ::utoipa::IntoResponses for #target_name #ty_generics #where_clause {
            fn responses() -> ::std::collections::BTreeMap<
                ::std::string::String,
                ::utoipa::openapi::RefOr<utoipa::openapi::response::Response>,
            > {
                use crate::adapter::inbound::rest::api_response::ErrResponseDef;
                Self::build_err_responses().into()
            }
        }
    };

    TokenStream::from(expanded)
}
