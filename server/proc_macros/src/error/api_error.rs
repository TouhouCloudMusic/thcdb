use darling::FromMeta;
use proc_macro::TokenStream;
use proc_macro2::TokenStream as TokenStream2;
use quote::quote;
use syn::punctuated::Punctuated;
use syn::token::Comma;
use syn::{
    Data, DataEnum, DataStruct, DeriveInput, Error, Expr, Fields, Ident, Path,
    PathArguments, Type, TypePath, Variant,
};

#[derive(Default, PartialEq, Debug)]
enum CodeOpt {
    #[default]
    Inner,
    Specified(Path),
}

#[derive(Default, Debug)]
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

#[derive(FromMeta, Default, Debug)]
struct ApiErrorVariantMeta {
    status_code: CodeOpt,
    error_code: CodeOpt,
    into_response: IntoResponseOpt,
}

#[derive(FromMeta, Default)]
struct ApiErrorEnumMeta {}

#[derive(FromMeta, Default)]
struct ApiErrorStructMeta {
    status_code: CodeOpt,
    error_code: CodeOpt,
    into_response: IntoResponseOpt,
}

pub fn derive_api_error_impl(input: DeriveInput) -> syn::Result<TokenStream> {
    let DeriveInput {
        attrs,
        vis: _vis,
        ident,
        generics,
        data,
    } = input;

    let impl_block = match data {
        Data::Enum(DataEnum { variants, .. }) => {
            gen_enum_impl(&ident, variants, &generics)?
        }
        Data::Struct(r#struct) => gen_struct_impl(&ident, &attrs, r#struct)?,
        _ => Err(Error::new_spanned(
            &ident,
            "ApiError can only be derived for enums and structs",
        ))?,
    };

    Ok(quote! {
        #impl_block

    }
    .into())
}

fn gen_enum_impl(
    ident: &Ident,
    variants: Punctuated<Variant, Comma>,
    generics: &syn::Generics,
) -> syn::Result<TokenStream2> {
    let mut status_code_left_arms = vec![];
    let mut status_code_right_arms = vec![];

    let mut all_status_codes = vec![];
    let mut inner_all_status_code_types = vec![];

    let mut error_code_left_arms = vec![];
    let mut error_code_right_arms = vec![];

    let mut into_response_arms = vec![];

    let (impl_generics, ty_generics, where_clause) = generics.split_for_impl();

    for variant in &variants {
        let var_name = &variant.ident;
        let api_err_attr = 'ret: {
            for attr in &variant.attrs {
                if attr.path().is_ident("api_error") {
                    break 'ret ApiErrorVariantMeta::from_meta(&attr.meta)?;
                }
            }

            ApiErrorVariantMeta::default()
        };

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
                let field_ty = insert_colon2_in_type_path(field_ty.clone());

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

            Fields::Named(_) => {
                if api_err_attr.status_code == CodeOpt::Inner
                    || api_err_attr.error_code == CodeOpt::Inner
                {
                    Err(Error::new_spanned(
                        variant,
                        format!(
                            "Named fields variant {:?} are not support inner method.\nAttrs: {:?}",
                            variant.ident.to_string(),
                            api_err_attr
                        ),
                    ))?;
                }

                status_code_left_arms.push(quote! {
                    Self::#var_name { .. }
                });

                error_code_left_arms.push(quote! {
                    Self::#var_name { .. }
                });
                into_response_arms.push(quote! {
                    Self::#var_name { .. } => self.into_api_response()
                });
            }
        };
    }

    Ok(quote! {
        impl #impl_generics crate::api_response::StatusCodeExt for #ident #ty_generics
            #where_clause
        {
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

        impl #impl_generics crate::error::AsErrorCode for #ident #ty_generics
            #where_clause
        {
            fn as_error_code(&self) -> crate::error::ErrorCode {
                match self {
                    #(#error_code_left_arms => #error_code_right_arms),*

                }
            }
        }

        impl #impl_generics ::axum::response::IntoResponse for #ident #ty_generics
            #where_clause
        {
            fn into_response(self) -> ::axum::response::Response {
                use crate::api_response::IntoApiResponse;
                match self {
                    #(#into_response_arms),*

                }
            }
        }
    })
}

fn insert_colon2_in_type_path(mut ty: Type) -> Type {
    if let Type::Path(TypePath {
        qself: None,
        ref mut path,
    }) = ty
    {
        for segment in &mut path.segments {
            if let PathArguments::AngleBracketed(ref mut abga) =
                segment.arguments
            {
                abga.colon2_token.get_or_insert(Default::default());
            }
        }
    }

    ty
}

fn gen_struct_impl(
    ident: &Ident,
    attrs: &[syn::Attribute],
    r#struct: DataStruct,
) -> syn::Result<TokenStream2> {
    let api_err_attr = 'ret: {
        for attr in attrs {
            if attr.path().is_ident("api_error") {
                break 'ret ApiErrorStructMeta::from_meta(&attr.meta)?;
            }
        }

        ApiErrorStructMeta::default()
    };

    let (status_code_impl, all_status_code_impl) = match api_err_attr
        .status_code
    {
        CodeOpt::Specified(path) => (
            quote! {
                #path
            },
            quote! {
                std::iter::once(#path)
            },
        ),
        CodeOpt::Inner => (
            quote! {
                self.0.as_status_code()
            },
            quote! {
                <self.0 as crate::api_response::StatusCodeExt>::all_status_codes()
            },
        ),
    };

    let error_code_impl = match api_err_attr.error_code {
        CodeOpt::Specified(path) => {
            quote! {
                #path
            }
        }
        CodeOpt::Inner => {
            quote! {
                self.0.as_error_code()
            }
        }
    };

    let into_res_impl = match api_err_attr.into_response {
        IntoResponseOpt::Inner
            if r#struct.fields.len() == 1
                && r#struct.fields.iter().next().unwrap().ident.is_none() =>
        {
            quote! {
                self.0.into_response()
            }
        }
        _ => {
            quote! {
                self.into_api_response()
            }
        } /* _ => {
           *     return Err(Error::new_spanned(
           *         ident,
           *         "Only new type struct support inner into_response",
           *     ));
           * } */
    };

    Ok(quote! {
        impl crate::api_response::StatusCodeExt for #ident {
            fn as_status_code(&self) -> ::axum::http::StatusCode {
                #status_code_impl
            }

            fn all_status_codes() -> impl Iterator<Item=::axum::http::StatusCode> {
                #all_status_code_impl
            }
        }

        impl crate::error::AsErrorCode for #ident {
            fn as_error_code(&self) -> crate::error::ErrorCode {
                #error_code_impl
            }
        }

        impl ::axum::response::IntoResponse for #ident {
            fn into_response(self) -> ::axum::response::Response {
                use crate::api_response::IntoApiResponse;
                #into_res_impl
            }
        }
    })
}
