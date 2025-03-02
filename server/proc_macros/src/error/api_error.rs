use darling::FromMeta;
use proc_macro::TokenStream;
use proc_macro2::TokenStream as TokenStream2;
use quote::quote;
use syn::punctuated::Punctuated;
use syn::token::Comma;
use syn::{
    Data, DataEnum, DeriveInput, Error, Expr, Fields, Ident, Path, Variant,
};

#[derive(Default)]
enum CodeOpt {
    #[default]
    Inner,
    Specified(Path),
}

#[derive(Default)]
enum IntoResponseOpt {
    #[default]
    Inner,
    ItSelf,
}

impl darling::FromMeta for CodeOpt {
    fn from_expr(expr: &Expr) -> darling::Result<Self> {
        if let Expr::Path(path) = expr {
            if path.path.is_ident("inner") {
                Ok(CodeOpt::Inner)
            } else {
                Ok(CodeOpt::Specified(path.path.clone()))
            }
        } else {
            Err(darling::Error::custom("invalid code"))
        }
    }

    fn from_none() -> Option<Self> {
        Some(CodeOpt::Inner)
    }
}

impl darling::FromMeta for IntoResponseOpt {
    fn from_expr(expr: &Expr) -> darling::Result<Self> {
        if let Expr::Path(path) = expr {
            if path.path.is_ident("inner") {
                Ok(IntoResponseOpt::Inner)
            } else if path.path.is_ident("self") {
                Ok(IntoResponseOpt::ItSelf)
            } else {
                Err(darling::Error::custom("invalid code"))
            }
        } else {
            Err(darling::Error::custom("invalid code"))
        }
    }

    fn from_none() -> Option<Self> {
        Some(IntoResponseOpt::Inner)
    }
}

#[derive(FromMeta, Default)]
struct ApiErrorVariantMeta {
    status_code: CodeOpt,
    error_code: CodeOpt,
    into_response: IntoResponseOpt,
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
    let mut status_code_left_arms = vec![];
    let mut status_code_right_arms = vec![];

    let mut all_status_codes = vec![];
    let mut inner_all_status_code_types = vec![];

    let mut error_code_left_arms = vec![];
    let mut error_code_right_arms = vec![];

    let mut into_response_arms = vec![];

    for variant in &variants {
        let var_name = &variant.ident;
        let api_err_attr = parse_api_error_attrs(variant)?;

        if let CodeOpt::Specified(code) = &api_err_attr.status_code {
            all_status_codes.push(code.clone());
            status_code_right_arms.push(quote! {
                #code
            });
        } else {
            status_code_right_arms.push(quote! {
                inner.as_status_code()
            });
        }

        if let CodeOpt::Specified(code) = &api_err_attr.error_code {
            error_code_right_arms.push(quote! {
                #code
            });
        } else {
            error_code_right_arms.push(quote! {
                inner.as_error_code()
            });
        }

        match &variant.fields {
            Fields::Unnamed(fields) => {
                if fields.unnamed.len() != 1 {
                    return Err(Error::new_spanned(
                        fields,
                        "Field length must be 1",
                    ));
                }

                let field_ty = fields.unnamed.first().map(|f| &f.ty).unwrap();

                match api_err_attr.status_code {
                    CodeOpt::Specified(_) => {
                        status_code_left_arms.push(quote! {
                            Self::#var_name(_)
                        });
                    }
                    CodeOpt::Inner => {
                        inner_all_status_code_types.push(field_ty);

                        status_code_left_arms.push(quote! {
                            Self::#var_name(inner)
                        });
                    }
                };

                match api_err_attr.error_code {
                    CodeOpt::Specified(_) => {
                        error_code_left_arms.push(quote! {
                            Self::#var_name(_)
                        });
                    }
                    CodeOpt::Inner => {
                        error_code_left_arms.push(quote! {
                            Self::#var_name(inner)
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
                            Self::#var_name(inner) => inner.into_response()
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
                    CodeOpt::Specified(_) => {
                        status_code_left_arms.push(quote! { Self::#var_name });
                    }
                    CodeOpt::Inner => {
                        Err(no_specify_error_builder("status_code"))?
                    }
                };

                match api_err_attr.error_code {
                    CodeOpt::Specified(_) => {
                        error_code_left_arms.push(quote! {
                            Self::#var_name
                        });
                    }
                    CodeOpt::Inner => {
                        Err(no_specify_error_builder("error_code"))?
                    }
                };

                into_response_arms.push(quote! {
                    Self::#var_name => self.into_api_response()
                });
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
                    #(#status_code_left_arms => #status_code_right_arms),*

                }
            }

            fn all_status_codes() -> impl Iterator<Item=::axum::http::StatusCode> {
                std::iter::empty()
                    .chain([
                        #(#all_status_codes),*
                    ])
                    #(.chain(#inner_all_status_code_types::all_status_codes()))*

            }
        }

        impl crate::error::AsErrorCode for #ident {
            fn as_error_code(&self) -> crate::error::ErrorCode {
                match self {
                    #(#error_code_left_arms => #error_code_right_arms),*

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

fn parse_api_error_attrs(
    variant: &Variant,
) -> syn::Result<ApiErrorVariantMeta> {
    for attr in &variant.attrs {
        if attr.path().is_ident("api_error") {
            return Ok(ApiErrorVariantMeta::from_meta(&attr.meta)?);
        }
    }

    Ok(ApiErrorVariantMeta::default())
}
