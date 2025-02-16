use std::vec;

use proc_macro::TokenStream;
use proc_macro2::TokenStream as TokenStream2;
use quote::{ToTokens, quote};
use syn::parse::{Parse, ParseStream};
use syn::punctuated::Punctuated;
use syn::spanned::Spanned;
use syn::token::Comma;
use syn::{
    Data, DataEnum, DeriveInput, Error, Expr, Fields, Ident, Meta, Variant,
};

enum Code {
    Inner,
    Specified(proc_macro2::TokenStream),
}

struct ApiErrorAttrs {
    status_code: Code,
    error_code: Code,
}

impl Parse for ApiErrorAttrs {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        fn parse_meta(meta: &Meta, error: &'static str) -> syn::Result<Code> {
            match &meta {
                Meta::NameValue(nv) if let Expr::Path(path) = &nv.value => {
                    Ok(if path.path.is_ident("self") {
                        Code::Inner
                    } else {
                        Code::Specified(path.to_token_stream())
                    })
                }
                _ => Err(Error::new_spanned(meta, error)),
            }
        }

        let metas = Punctuated::<Meta, Comma>::parse_terminated(input)?;

        let mut status_code = None;
        let mut error_code = None;

        for meta in metas {
            if meta.path().is_ident("status_code") {
                if status_code.is_some() {
                    return Err(Error::new_spanned(
                        meta,
                        "Duplicate `status_code` attribute found",
                    ));
                }
                status_code = Some(parse_meta(
                    &meta,
                    "Invalid attribute syntax: must be `status_code = ...` or `status_code` = self`",
                )?)
            } else if meta.path().is_ident("error_code") {
                if error_code.is_some() {
                    return Err(Error::new_spanned(
                        meta,
                        "Duplicate 'error_code' attribute found",
                    ));
                }
                error_code = Some(parse_meta(
                    &meta,
                    "Invalid attribute syntax: must be `error_code = ...` or `error_code = self`",
                )?)
            }
        }
        let status_code = status_code.ok_or_else(|| {
            Error::new(input.span(), "Missing required 'status_code' attribute")
        })?;

        let error_code = error_code.ok_or_else(|| {
            Error::new(input.span(), "Missing required 'error_code' attribute")
        })?;

        Ok(ApiErrorAttrs {
            status_code,
            error_code,
        })
    }
}

pub fn derive_api_error_impl(input: DeriveInput) -> syn::Result<TokenStream> {
    let name = &input.ident;

    let variants = match input.data {
        Data::Enum(DataEnum { variants, .. }) => variants,
        _ => Err(Error::new_spanned(
            &input,
            "ApiError can only be derived for enums",
        ))?,
    };

    let impl_block = gen_api_error_impl(name, variants)?;

    Ok(quote! {
        #impl_block

        impl crate::error::ApiErrorTrait for #name {}
    }
    .into())
}

fn gen_api_error_impl(
    ident: &Ident,
    variants: Punctuated<Variant, Comma>,
) -> syn::Result<TokenStream2> {
    let mut status_code_arms = vec![];
    let mut codes = vec![];
    let mut field_types = vec![];
    let mut error_code_arms = vec![];

    for variant in &variants {
        let var_name = &variant.ident;
        let api_err_attr = parse_api_error_attrs(variant)?;

        match &variant.fields {
            Fields::Unnamed(fields) => {
                if fields.unnamed.len() != 1 {
                    return Err(Error::new_spanned(
                        fields,
                        "Only accepts a single StatusCode",
                    ));
                }

                let field_ty = fields.unnamed.first().map(|f| &f.ty).unwrap();

                match api_err_attr.status_code {
                    Code::Specified(code) => {
                        codes.push(code.clone());
                        status_code_arms.push(quote! {
                            Self::#var_name(_) => #code
                        });
                    }
                    Code::Inner => {
                        field_types.push(field_ty);

                        status_code_arms.push(quote! {
                            Self::#var_name(inner) => inner.as_status_code()
                        });
                    }
                };

                match api_err_attr.error_code {
                    Code::Specified(code) => {
                        error_code_arms.push(quote! {
                            Self::#var_name(_) => #code
                        });
                    }
                    Code::Inner => {
                        error_code_arms.push(quote! {
                            Self::#var_name(inner) => inner.as_error_code()
                        });
                    }
                };
            }
            Fields::Unit => {
                match api_err_attr.status_code {
                    Code::Specified(code) => {
                        codes.push(code.clone());
                        status_code_arms
                            .push(quote! { Self::#var_name => #code });
                    }
                    Code::Inner => Err(Error::new_spanned(
                        variant,
                        "Unit variant must specify status code",
                    ))?,
                };

                match api_err_attr.error_code {
                    Code::Specified(code) => {
                        error_code_arms.push(quote! {
                            Self::#var_name => #code;
                        });
                    }
                    Code::Inner => {
                        error_code_arms.push(quote! {
                            Self::#var_name(inner) => inner.as_error_code()
                        });
                    }
                }
            }
            Fields::Named(_) => Err(Error::new_spanned(
                variant,
                "Named variant fields are not supported",
            ))?,
        };
    }

    Ok(quote! {
        impl crate::api_response::StatusCodeExt for #ident {
            fn as_status_code(&self) -> ::axum::http::StatusCode {
                match self {
                    #(#status_code_arms),*
                }
            }

            fn all_status_codes() -> impl Iterator<Item=::axum::http::StatusCode> {
                std::iter::empty()
                    .chain([
                        #(#codes),*
                    ])
                    #(.chain(#field_types::all_status_codes()))*
            }
        }

        impl crate::error::AsErrorCode for #ident {
            fn as_error_code(&self) -> crate::error::ErrorCode {
                match self {
                    #(#error_code_arms),*
                }
            }
        }
    })
}

fn parse_api_error_attrs(variant: &Variant) -> syn::Result<ApiErrorAttrs> {
    for attr in &variant.attrs {
        if attr.path().is_ident("api_error") {
            return match &attr.meta {
                Meta::List(list) => list.parse_args::<ApiErrorAttrs>(),
                _ => Err(Error::new_spanned(
                    attr,
                    "Invalid api error attribute syntax",
                ))?,
            };
        }
    }

    Err(Error::new(
        variant.span(),
        "Missing required #[api_error(...)] attribute on variant",
    ))
}
