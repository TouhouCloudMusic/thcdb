#![feature(let_chains)]
#![feature(if_let_guard)]

use error::*;
use from_ref_arc::derive_from_ref_arc_impl;
use proc_macro::TokenStream;
use quote::quote;
use syn::{Data, DeriveInput, Fields, parse_macro_input};

mod error;
mod field_enum;
mod from_ref_arc;
mod utils;

// TODO: Better name
#[proc_macro_derive(EnumToResponse)]
pub fn derive_into_response(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let enum_name = &input.ident;

    let data_enum = match input.data {
        Data::Enum(e) => e,
        _ => {
            return syn::Error::new_spanned(&input, "Not an enum")
                .to_compile_error()
                .into();
        }
    };

    let branches: Vec<_> = data_enum
        .variants
        .iter()
        .map(|variant| {
            let variant_ident = &variant.ident;

            match &variant.fields {
                Fields::Unnamed(fields) if fields.unnamed.len() == 1 => {
                    quote! {
                        #enum_name::#variant_ident(err) => err.into_response()
                    }
                }
                _ => syn::Error::new_spanned(
                    variant,
                    "Only single-field tuple variants are supported",
                )
                .to_compile_error(),
            }
        })
        .collect();

    let expanded = quote! {
        impl axum::response::IntoResponse for #enum_name {
            fn into_response(self) -> axum::response::Response {
                match self {
                    #(#branches),*
                }
            }
        }
    };

    TokenStream::from(expanded)
}

#[proc_macro_derive(IntoErrorSchema)]
pub fn derive_impl_error_schema(input: TokenStream) -> TokenStream {
    error_schema_impl(input)
}

#[proc_macro_derive(ApiError, attributes(api_error))]
pub fn derive_api_error(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    match derive_api_error_impl(input) {
        Ok(v) => v,
        Err(e) => e.to_compile_error().into(),
    }
}

#[proc_macro_derive(FromRefArc, attributes(from_ref_arc))]
pub fn derive_from_ref_arc(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    match derive_from_ref_arc_impl(input) {
        Ok(v) => v.into(),
        Err(e) => e.to_compile_error().into(),
    }
}

#[proc_macro_derive(FieldEnum, attributes(field_enum))]
pub fn derive_field_enum(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    match field_enum::derive_impl(input) {
        Ok(v) => v.into(),
        Err(e) => e.to_compile_error().into(),
    }
}
