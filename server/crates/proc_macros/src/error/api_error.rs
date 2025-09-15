use darling::{FromDeriveInput, FromField, FromVariant};
use proc_macro2::{Span, TokenStream};
use quote::quote;
use syn::{
    DeriveInput, Error, Expr, Ident, Path, PathArguments, Token, Type,
    TypePath, parse_str,
};

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
    // For named-field variants: forward to a specific field, e.g. `source`
    Field(Ident),
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
            } else if let Some(seg) = path.path.segments.last() {
                Ok(IntoResponseOpt::Field(seg.ident.clone()))
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
    ident: Option<Ident>,
    ty: syn::Type,
}

#[derive(Debug, Clone, FromField)]

struct ApiErrorField {
    ident: Option<Ident>,
    ty: syn::Type,
}

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
                let inner_type = add_turbo_fish(inner_type);

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
                    IntoResponseOpt::Field(_) => unreachable!(),
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

                // Forward impl to source by default if not specified
                let source_field = fields.fields.iter().find_map(|field| {
                    field.ident.as_ref().and_then(|ident| {
                        if ident == "source" {
                            Some((ident.clone(), field.ty.clone()))
                        } else {
                            None
                        }
                    })
                });

                let needs_source = matches!(variant.status_code, CodeOpt::None);

                let missing_source = || {
                    Error::new_spanned(
                        var_name,
                        format!(
                            "Named fields variant `{}` must specify #[api_error(...)] or contain a `source` field",
                            var_name
                        ),
                    )
                };

                // If no status_code is specified and there is no `source`,
                // we cannot infer defaults, so bail out during macro expansion.
                if needs_source && source_field.is_none() {
                    return Err(missing_source());
                }

                match variant.status_code {
                    CodeOpt::None => {
                        let (source_ident, source_ty) =
                            source_field.clone().unwrap();
                        let source_ty = add_turbo_fish(source_ty);
                        status_code_left_arms.push(
                            quote! { Self::#var_name { #source_ident, .. } },
                        );
                        status_code_right_arms
                            .push(quote! { #source_ident.as_status_code() });
                        all_status_code_iter
                            .push(quote! { #source_ty::all_status_codes() });
                    }
                    CodeOpt::Specified(path) => {
                        status_code_left_arms
                            .push(quote! { Self::#var_name { .. } });
                        status_code_right_arms.push(quote! { #path });
                        all_status_code_item.push(quote! { #path });
                    }
                    CodeOpt::Inner => unreachable!(),
                }

                match variant.into_response {
                    IntoResponseOpt::Field(ref ident) => {
                        let field_ident = ident;
                        into_response_arms.push(quote! {
                            Self::#var_name { #field_ident, .. } => #field_ident.into_response()
                        });
                    }
                    IntoResponseOpt::ItSelf => {
                        into_response_arms.push(quote! {
                            Self::#var_name { .. } => self.into_api_response()
                        });
                    }
                    IntoResponseOpt::None => {
                        into_response_arms.push(quote! {
                            Self::#var_name { .. } => self.into_api_response()
                        });
                    }
                    IntoResponseOpt::Inner => {
                        return Err(Error::new_spanned(
                            var_name,
                            format!(
                                "Named fields variant `{}` does not support `into_response = inner`",
                                var_name
                            ),
                        ));
                    }
                }
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
    // Struct errors follow the same rule: prefer a `source` field for implicit
    // status/response forwarding.
    let source_field = strc.fields.iter().find_map(|field| {
        field.ident.as_ref().and_then(|ident| {
            if ident == "source" {
                Some((ident.clone(), field.ty.clone()))
            } else {
                None
            }
        })
    });

    let missing_source = || {
        Error::new_spanned(
            ident,
            "No status_code specified and `source` field not found",
        )
    };

    // Without an explicit status_code and no `source` field, we cannot derive
    // sensible defaults, so this must be rejected at compile time.
    let needs_struct_source = matches!(strc.style, darling::ast::Style::Struct)
        && matches!(receiver.status_code, CodeOpt::None);

    if needs_struct_source && source_field.is_none() {
        return Err(missing_source());
    }

    let status_code_impl = match strc.style {
        darling::ast::Style::Tuple
            if let CodeOpt::Inner | CodeOpt::None = receiver.status_code =>
        {
            quote! { self.0.as_status_code() }
        }
        darling::ast::Style::Struct
            if matches!(receiver.status_code, CodeOpt::None) =>
        {
            let (source_ident, _) = source_field.clone().unwrap();
            quote! { self.#source_ident.as_status_code() }
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
        darling::ast::Style::Struct
            if matches!(receiver.status_code, CodeOpt::None) =>
        {
            let (_, source_ty) = source_field.clone().unwrap();
            let source_ty = add_turbo_fish(source_ty);
            quote! { #source_ty::all_status_codes() }
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
        _ => match receiver.into_response {
            IntoResponseOpt::ItSelf => quote! { self.into_api_response() },
            IntoResponseOpt::None => quote! { self.into_api_response() },
            IntoResponseOpt::Field(ref ident) => {
                let field_ident = ident;
                quote! { self.#field_ident.into_response() }
            }
            IntoResponseOpt::Inner => Err(Error::new_spanned(
                ident,
                "No into_response specified or invalid syntax",
            ))?,
        },
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

fn add_turbo_fish(mut ty: syn::Type) -> syn::Type {
    if let Type::Path(TypePath { path, .. }) = &mut ty
        && let Some(last_segment) = path.segments.last_mut()
        && let PathArguments::AngleBracketed(ref mut angle_args) =
            last_segment.arguments
        && angle_args.colon2_token.is_none()
    {
        angle_args.colon2_token = Some(Token![::](Span::call_site()));
    }
    ty
}
