#![feature(if_let_guard)]

use error::*;
use from_ref_arc::derive_from_ref_arc_impl;
use proc_macro::TokenStream;
use syn::{DeriveInput, parse_macro_input};

mod auto_mapper;
mod cmp_chain;
mod error;
mod field_enum;
mod from_ref_arc;
mod utils;

#[proc_macro_derive(IntoErrorSchema)]
pub fn derive_impl_error_schema(input: TokenStream) -> TokenStream {
    error_schema_impl(input)
}

#[proc_macro_derive(ApiError, attributes(api_error))]
pub fn derive_api_error(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    match derive_api_error_impl(input) {
        Ok(v) => v.into(),
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

#[proc_macro_derive(AutoMapper, attributes(mapper))]
pub fn derive_auto_mapper(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    match auto_mapper::derive_impl(input) {
        Ok(v) => v.into(),
        Err(e) => e.to_compile_error().into(),
    }
}

#[proc_macro]
pub fn cmp_chain(input: TokenStream) -> TokenStream {
    cmp_chain::cmp_chain(input.into()).into()
}
