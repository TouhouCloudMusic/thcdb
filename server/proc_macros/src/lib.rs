use proc_macro::TokenStream;
use quote::quote;
use syn::{Data, DeriveInput, Fields, parse_macro_input};

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
