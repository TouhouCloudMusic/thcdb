#![feature(let_chains)]
#![feature(if_let_guard)]

use error::*;
use itertools::Itertools;
use proc_macro::TokenStream;
use quote::quote;
use syn::parse::{Parse, ParseStream};
use syn::punctuated::Punctuated;
use syn::token::Comma;
use syn::{Data, DeriveInput, Fields, ItemFn, parse_macro_input};

mod error;
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

struct ServiceArgs {
    services: Punctuated<syn::Ident, Comma>,
}

impl Parse for ServiceArgs {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        const SERVICE_LIST: [&str; 9] = [
            "artist",
            "correction",
            "event",
            "image",
            "label",
            "release",
            "song",
            "tag",
            "user",
        ];

        let services =
            Punctuated::<syn::Ident, Comma>::parse_terminated(input)?;

        for ident in &services {
            if !SERVICE_LIST.contains(&&*ident.to_string()) {
                let valid = SERVICE_LIST.join(", ");
                return Err(syn::Error::new_spanned(
                    ident,
                    format!(
                        "Invalid service '{}'. Valid options are: {}",
                        ident, valid
                    ),
                ));
            }
        }

        Ok(Self { services })
    }
}

#[proc_macro_attribute]
pub fn use_service(attr: TokenStream, item: TokenStream) -> TokenStream {
    let args = parse_macro_input!(attr as ServiceArgs);

    let mut input_fn = parse_macro_input!(item as ItemFn);

    let services = args.services.into_iter().unique();

    for service in services.rev() {
        let param_name = format!("::axum::extract::State({}_service)", service);
        let param_type = format!(
            "::axum::extract::State<crate::service::{}::Service>",
            service
        );

        let new_arg: syn::FnArg =
            syn::parse_str(&format!("{}: {}", param_name, param_type)).unwrap();

        input_fn.sig.inputs.insert(0, new_arg);
    }

    quote::quote!(#input_fn).into()
}

/// ```no_run
/// #[use_session]
/// fn foo() {
///     session.xxx();
/// }
///
/// #[use_session(baz)]
/// fn bar() {
///     baz.xxx();
/// }
/// ```
#[proc_macro_attribute]
pub fn use_session(attr: TokenStream, item: TokenStream) -> TokenStream {
    let ident = parse_macro_input!(attr as Option<syn::Ident>);

    let mut input_fn = parse_macro_input!(item as ItemFn);

    let param_name = if let Some(name) = ident {
        name.to_string()
    } else {
        "session".to_string()
    };
    let param_type = "crate::service::user::AuthSession";

    let new_arg: syn::FnArg =
        syn::parse_str(&format!("{}: {}", param_name, param_type)).unwrap();

    input_fn.sig.inputs.insert(0, new_arg);
    quote::quote!(#input_fn).into()
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
