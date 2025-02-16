pub use api_error::*;
use proc_macro::TokenStream;
use quote::quote;
use syn::{Data, DeriveInput, Error, parse_macro_input};

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

pub fn from_db_err_impl(input: TokenStream) -> TokenStream {
    let mut input = parse_macro_input!(input as DeriveInput);
    let enum_name = &input.ident;

    let _data_enum = match &mut input.data {
        Data::Enum(e) => e,
        _ => {
            return Error::new_spanned(&input, "Not an enum")
                .to_compile_error()
                .into();
        }
    };

    // let db_err_variant = Variant {
    //     attrs: vec![],
    //     ident: Ident::new("DbErr", Span::call_site()),
    //     fields: Fields::Unnamed(FieldsUnnamed {
    //         paren_token: Default::default(),
    //         unnamed: {
    //             let mut field = Punctuated::<Field, Comma>::new();
    //             field.push(Field {
    //                 attrs: Vec::new(),
    //                 vis: syn::Visibility::Inherited,
    //                 ident: None,
    //                 colon_token: None,
    //                 ty: parse_quote! {
    //                     crate::error::DbErrWrapper
    //                 },
    //                 mutability: syn::FieldMutability::None,
    //             });

    //             field
    //         },
    //     }),
    //     discriminant: None,
    // };

    // data_enum.variants.push(db_err_variant);

    quote! {


        impl From<::sea_orm::DbErr> for #enum_name {
            fn from(val: ::sea_orm::DbErr) -> Self {
                Self::DbErr(val.into())
            }
        }
    }
    .into()
}
