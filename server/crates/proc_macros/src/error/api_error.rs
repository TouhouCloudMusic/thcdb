use darling::{FromDeriveInput, FromField, FromVariant};
use proc_macro2::TokenStream;
use quote::quote;
use syn::{DeriveInput, Error, Expr, Ident, Path, parse_str};

#[derive(Default, PartialEq, Debug, Clone)]
enum CodeOpt {
    #[default]
    None,
    Inner,
    Specified(Path),
}

impl CodeOpt {
    pub fn or(self, other: CodeOpt) -> CodeOpt {
        match self {
            CodeOpt::None => other,
            _ => self,
        }
    }
}

#[derive(Default, Debug, Clone)]
enum IntoResponseOpt {
    #[default]
    None,
    Inner,
    ItSelf,
}

impl IntoResponseOpt {
    pub fn or(self, other: IntoResponseOpt) -> IntoResponseOpt {
        match self {
            IntoResponseOpt::None => other,
            _ => self,
        }
    }
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
        Some(CodeOpt::None)
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

#[derive(FromDeriveInput)]
#[darling(attributes(api_error))]
struct ApiErrorReceiver {
    ident: Ident,
    generics: syn::Generics,
    data: darling::ast::Data<ApiErrorVariantReceiver, ApiErrorField>,
    #[darling(default)]
    status_code: CodeOpt,
    #[darling(default)]
    into_response: IntoResponseOpt,
}

#[derive(FromVariant, Clone)]
#[darling(attributes(api_error))]
struct ApiErrorVariantReceiver {
    ident: Ident,
    fields: darling::ast::Fields<ApiErrorVariantField>,
    #[darling(default)]
    status_code: CodeOpt,
    #[darling(default)]
    into_response: IntoResponseOpt,
}

#[derive(Debug, Clone, FromField)]
struct ApiErrorVariantField {
    ty: syn::Type,
}

#[derive(FromField)]

struct ApiErrorField {}

static API_RESPONSE_MOD_PATH: &str = "crate::presentation::api_response";

pub fn derive_api_error_impl(input: DeriveInput) -> syn::Result<TokenStream> {
    let receiver = ApiErrorReceiver::from_derive_input(&input)
        .map_err(|e| Error::new_spanned(&input, e.to_string()))?;

    let tokens = match receiver.data {
        darling::ast::Data::Enum(ref variants) => {
            derive_enum_impl(&receiver, variants)?
        }
        darling::ast::Data::Struct(_) => derive_struct_impl(&receiver)?,
    };

    Ok(tokens)
}

fn derive_enum_impl(
    receiver: &ApiErrorReceiver,
    variants: &[ApiErrorVariantReceiver],
) -> syn::Result<TokenStream> {
    let ident = &receiver.ident;
    let (impl_generics, ty_generics, where_clause) =
        receiver.generics.split_for_impl();

    let mut status_code_left_arms = vec![];
    let mut status_code_right_arms = vec![];
    let mut all_status_code_iter = vec![];
    let mut all_status_code_item = vec![];

    let mut into_response_arms = vec![];

    for variant in variants {
        let var_name = &variant.ident;
        let fields = &variant.fields;
        let mut variant = variant.clone();

        variant.status_code =
            variant.status_code.or(receiver.status_code.clone());
        variant.into_response =
            variant.into_response.or(receiver.into_response.clone());

        match fields.style {
            darling::ast::Style::Tuple => {
                if fields.len() != 1 {
                    return Err(Error::new_spanned(
                        var_name,
                        "Field length must be 1",
                    ));
                }

                let inner_type = fields.fields[0].ty.clone();

                match &variant.status_code {
                    CodeOpt::Specified(code) => {
                        status_code_left_arms
                            .push(quote! { Self::#var_name(_) });
                        status_code_right_arms.push(quote! { #code });
                        all_status_code_item.push(quote! { #code });
                    }
                    // Default value is inner
                    CodeOpt::Inner | CodeOpt::None => {
                        status_code_left_arms
                            .push(quote! { Self::#var_name(inner) });
                        status_code_right_arms
                            .push(quote! { inner.as_status_code() });
                        all_status_code_iter
                            .push(quote! { #inner_type::all_status_codes() });
                    }
                }

                match variant.into_response {
                    IntoResponseOpt::ItSelf => {
                        into_response_arms.push(quote! {
                            Self::#var_name(_) => self.into_api_response()
                        });
                    }
                    IntoResponseOpt::Inner | IntoResponseOpt::None => {
                        into_response_arms.push(quote! {
                            Self::#var_name(inner) => inner.into_response()
                        });
                    }
                }
            }
            darling::ast::Style::Unit => {
                let no_specify_error_builder = |name: &str| {
                    Error::new_spanned(
                        var_name,
                        format!("Unit variant must specify {name}"),
                    )
                };

                match &variant.status_code {
                    CodeOpt::Specified(code) => {
                        status_code_left_arms.push(quote! { Self::#var_name });
                        status_code_right_arms.push(quote! { #code });
                        all_status_code_item.push(quote! { #code });
                    }
                    CodeOpt::Inner | CodeOpt::None => {
                        return Err(no_specify_error_builder("status_code"));
                    }
                }

                into_response_arms.push(quote! {
                    Self::#var_name => self.into_api_response()
                });
            }
            darling::ast::Style::Struct => {
                if matches!(variant.status_code, CodeOpt::Inner) {
                    return Err(Error::new_spanned(
                        var_name,
                        format!(
                            "Named fields variant {:?} are not support inner method.\nAttrs: {:?}",
                            var_name.to_string(),
                            &fields.fields
                        ),
                    ));
                }

                match variant.status_code {
                    CodeOpt::None => {
                        status_code_left_arms
                            .push(quote! { Self::#var_name { .. } });
                        status_code_right_arms
                            .push(quote! { self.as_status_code() });
                    }
                    CodeOpt::Specified(path) => {
                        status_code_left_arms
                            .push(quote! { Self::#var_name { .. } });
                        status_code_right_arms.push(quote! { #path });
                        all_status_code_item.push(quote! { #path });
                    }
                    CodeOpt::Inner => unreachable!(),
                }

                into_response_arms.push(quote! {
                    Self::#var_name { .. } => self.into_api_response()
                });
            }
        }
    }

    let mod_path: TokenStream = parse_str(API_RESPONSE_MOD_PATH)?;
    Ok(quote! {
        impl #impl_generics #mod_path::ApiError for #ident #ty_generics
            #where_clause
        {
            fn as_status_code(&self) -> ::axum::http::StatusCode {
                match self {
                    #(#status_code_left_arms => #status_code_right_arms),*
                }
            }

            fn all_status_codes() -> impl Iterator<Item=::axum::http::StatusCode> {
                use #mod_path::ApiError;
                std::iter::empty()
                    .chain([
                        #(#all_status_code_item),*
                    ])
                    #(.chain(#all_status_code_iter))*
            }
        }

        impl #impl_generics ::axum::response::IntoResponse for #ident #ty_generics
            #where_clause
        {
            fn into_response(self) -> ::axum::response::Response {
                use #mod_path::IntoApiResponse;
                match self {
                    #(#into_response_arms),*
                }
            }
        }
    })
}

fn derive_struct_impl(receiver: &ApiErrorReceiver) -> syn::Result<TokenStream> {
    let ident = &receiver.ident;
    let (impl_generics, ty_generics, where_clause) =
        receiver.generics.split_for_impl();

    let data = &receiver.data;

    let strc = data.as_ref().take_struct().unwrap();
    let status_code_impl = match strc.style {
        darling::ast::Style::Tuple
            if let CodeOpt::Inner | CodeOpt::None = receiver.status_code =>
        {
            quote! { self.0.as_status_code() }
        }
        _ => {
            if let CodeOpt::Specified(ref path) = receiver.status_code {
                quote! { #path }
            } else {
                Err(Error::new_spanned(ident, "No status_code specified"))?
            }
        }
    };

    let all_status_code_impl = match strc.style {
        darling::ast::Style::Tuple
            if let CodeOpt::Inner | CodeOpt::None = receiver.status_code =>
        {
            quote! { self.0.all_status_codes() }
        }
        _ => {
            if let CodeOpt::Specified(ref path) = receiver.status_code {
                quote! { std::iter::once(#path) }
            } else {
                Err(Error::new_spanned(ident, "No status_code specified"))?
            }
        }
    };

    let into_res_impl = match strc.style {
        darling::ast::Style::Tuple
            if let IntoResponseOpt::Inner | IntoResponseOpt::None =
                receiver.into_response =>
        {
            quote! { self.0.into_response() }
        }
        _ => {
            if let IntoResponseOpt::ItSelf | IntoResponseOpt::None =
                receiver.into_response
            {
                quote! { self.into_api_response() }
            } else {
                Err(Error::new_spanned(
                    ident,
                    "No into_response specified or invalid syntax",
                ))?
            }
        }
    };

    let mod_path: TokenStream = syn::parse_str(API_RESPONSE_MOD_PATH)?;
    Ok(quote! {
        impl #impl_generics #mod_path::ApiError for #ident #ty_generics #where_clause {
            fn as_status_code(&self) -> ::axum::http::StatusCode {
                #status_code_impl
            }
            fn all_status_codes() -> impl Iterator<Item=::axum::http::StatusCode> {
                #all_status_code_impl
            }
        }

        impl #impl_generics ::axum::response::IntoResponse for #ident #ty_generics #where_clause {
            fn into_response(self) -> ::axum::response::Response {
                use #mod_path::IntoApiResponse;
                #into_res_impl
            }
        }
    })
}
