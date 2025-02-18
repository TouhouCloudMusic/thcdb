use std::vec;

use proc_macro::TokenStream;
use proc_macro2::TokenStream as TokenStream2;
use quote::{ToTokens, quote};
use syn::parse::{Parse, ParseStream};
use syn::punctuated::Punctuated;
use syn::token::Comma;
use syn::{
    Data, DataEnum, DeriveInput, Error, Expr, Fields, Ident, Meta, Variant,
};

enum CodeOpt {
    Inner,
    Specified(proc_macro2::TokenStream),
}

enum IntoResponseOpt {
    Inner,
    ItSelf,
}

struct ApiErrorAttrs {
    status_code: CodeOpt,
    error_code: CodeOpt,
    into_response: IntoResponseOpt,
}

impl Parse for ApiErrorAttrs {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        fn dupe_attr_err_builder(tokens: impl ToTokens, name: &str) -> Error {
            Error::new_spanned(
                tokens,
                format!("Duplicate `{name}` attribute found"),
            )
        }

        let metas = Punctuated::<Meta, Comma>::parse_terminated(input)?;

        let mut status_code = None;
        let mut error_code = None;
        let mut into_response = None;

        for meta in metas {
            if meta.path().is_ident("status_code") {
                if status_code.is_some() {
                    return Err(dupe_attr_err_builder(&meta, "status_code"));
                }
                status_code = Some(match meta {
                    Meta::NameValue(ref nv)
                        if let Expr::Path(path) = &nv.value =>
                    {
                        if path.to_token_stream().to_string() == "inner" {
                            CodeOpt::Inner
                        } else {
                            CodeOpt::Specified(path.to_token_stream())
                        }
                    }
                    _ => Err(Error::new_spanned(
                        &meta,
                        "Invalid attribute syntax: must be `status_code = ...` or `status_code = inner`",
                    ))?,
                })
            } else if meta.path().is_ident("error_code") {
                if error_code.is_some() {
                    return Err(Error::new_spanned(
                        meta,
                        "Duplicate 'error_code' attribute found",
                    ));
                }
                error_code = Some(match meta {
                    Meta::NameValue(ref nv)
                        if let Expr::Path(path) = &nv.value =>
                    {
                        if path.to_token_stream().to_string() == "inner" {
                            CodeOpt::Inner
                        } else {
                            CodeOpt::Specified(path.to_token_stream())
                        }
                    }
                    _ => Err(Error::new_spanned(
                        &meta,
                        "Invalid attribute syntax: must be `error_code = ...` or `error_code = inner`",
                    ))?,
                })
            } else if meta.path().is_ident("into_response") {
                if into_response.is_some() {
                    return Err(Error::new_spanned(
                        meta,
                        "Duplicate 'into_response' attribute found",
                    ));
                }
                into_response = Some(match meta {
                    Meta::NameValue(ref nv) => {
                        if nv.value.to_token_stream().to_string() == "self" {
                            IntoResponseOpt::ItSelf
                        } else {
                            Err(Error::new_spanned(
                                meta,
                                "Invalid attribute syntax: must be `into_response = self`",
                            ))?
                        }
                    }
                    _ => IntoResponseOpt::Inner,
                })
            } else {
                return Err(Error::new_spanned(
                    &meta,
                    format!(
                        "Invalid attribute found {:?}, valid options are `status_code`, `error_code` and `into_response`",
                        &meta
                    ),
                ));
            }
        }

        // Use internal fields if not set
        Ok(ApiErrorAttrs {
            status_code: status_code.unwrap_or(CodeOpt::Inner),
            error_code: error_code.unwrap_or(CodeOpt::Inner),
            into_response: into_response.unwrap_or(IntoResponseOpt::Inner),
        })
    }
}

pub fn derive_api_error_impl(input: DeriveInput) -> syn::Result<TokenStream> {
    let DeriveInput {
        attrs,
        vis: _vis,
        ident,
        generics: _generics,
        data,
    } = input;

    let variants = match data {
        Data::Enum(DataEnum { variants, .. }) => variants,
        _ => Err(Error::new_spanned(
            &ident,
            "ApiError can only be derived for enums",
        ))?,
    };

    let impl_block = gen_api_error_impl(&ident, variants)?;

    let is_enable_impl_api_error = !attrs.iter().any(|attr| {
        attr.path().is_ident("api_error")
            && attr
                .meta
                .require_list()
                .is_ok_and(|x| x.path.is_ident("disable_impl"))
    });

    let impl_api_error_trait = if is_enable_impl_api_error {
        quote! {
            impl crate::error::ApiErrorTrait for #ident {}
        }
        .into()
    } else {
        None
    };

    Ok(quote! {
        #impl_block

        #impl_api_error_trait

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
    let mut into_response_arms = vec![];

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
                    CodeOpt::Specified(code) => {
                        codes.push(code.clone());
                        status_code_arms.push(quote! {
                            Self::#var_name(_) => #code
                        });
                    }
                    CodeOpt::Inner => {
                        field_types.push(field_ty);

                        status_code_arms.push(quote! {
                            Self::#var_name(inner) => inner.as_status_code()
                        });
                    }
                };

                match api_err_attr.error_code {
                    CodeOpt::Specified(code) => {
                        error_code_arms.push(quote! {
                            Self::#var_name(_) => #code
                        });
                    }
                    CodeOpt::Inner => {
                        error_code_arms.push(quote! {
                            Self::#var_name(inner) => inner.as_error_code()
                        });
                    }
                };

                match api_err_attr.into_response {
                    IntoResponseOpt::ItSelf => {
                        into_response_arms.push(quote! {
                            Self::#var_name(_) => self.into_api_response()
                        });
                    }
                    IntoResponseOpt::Inner => {
                        into_response_arms.push(quote! {
                            Self::#var_name(inner) => inner.into_api_response()
                        });
                    }
                };
            }
            Fields::Unit => {
                let no_specify_error_builder = |name: &str| {
                    Error::new_spanned(
                        variant,
                        format!("Unit variant must specify {name}"),
                    )
                };

                match api_err_attr.status_code {
                    CodeOpt::Specified(code) => {
                        codes.push(code.clone());
                        status_code_arms
                            .push(quote! { Self::#var_name => #code });
                    }
                    CodeOpt::Inner => {
                        Err(no_specify_error_builder("status_code"))?
                    }
                };

                match api_err_attr.error_code {
                    CodeOpt::Specified(code) => {
                        error_code_arms.push(quote! {
                            Self::#var_name => #code;
                        });
                    }
                    CodeOpt::Inner => {
                        Err(no_specify_error_builder("error_code"))?
                    }
                };

                match api_err_attr.into_response {
                    IntoResponseOpt::ItSelf => {
                        into_response_arms.push(quote! {
                            Self::#var_name => self.into_api_response()
                        });
                    }
                    IntoResponseOpt::Inner => {
                        Err(no_specify_error_builder(""))?
                    }
                };
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

        impl ::axum::response::IntoResponse for #ident {
            fn into_response(self) -> ::axum::response::Response {
                use crate::api_response::IntoApiResponse;
                match self {
                    #(#into_response_arms),*

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

    Ok(ApiErrorAttrs {
        error_code: CodeOpt::Inner,
        status_code: CodeOpt::Inner,
        into_response: IntoResponseOpt::Inner,
    })
}
