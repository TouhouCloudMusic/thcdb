use darling::ast::{Data, NestedMeta};
use darling::{FromDeriveInput, FromField, FromMeta};
use itertools::Itertools;
use quote::{format_ident, quote};
use syn::{DeriveInput, Expr, Ident, Path};

#[derive(FromDeriveInput)]
#[darling(attributes(mapper), supports(struct_named))]
struct AutoMapperReceiver {
    ident: Ident,
    generics: syn::Generics,
    data: Data<(), AutoMapperField>,
    #[darling(multiple)]
    from: Vec<ConvEntry>,
    #[darling(multiple)]
    into: Vec<ConvEntry>,
}

#[derive(Debug, FromField)]
#[darling(attributes(mapper))]
struct AutoMapperField {
    ident: Option<syn::Ident>,
    #[darling(multiple)]
    on: Vec<OnEntry>,
}

struct ConvEntry {
    path: Path,
    map: Option<Path>,
    default: Option<bool>,
}

impl FromMeta for ConvEntry {
    fn from_list(items: &[darling::ast::NestedMeta]) -> darling::Result<Self> {
        let mut errors = darling::Error::accumulator();
        let path = match &items[0] {
            NestedMeta::Meta(syn::Meta::Path(path)) => Some(path.clone()),
            _ => {
                errors.push(
                    darling::Error::custom("Expected path as first argument.")
                        .with_span(&items[0]),
                );
                None
            }
        };

        let mut map = None;
        const MAP: &str = "map";
        let mut default = None;
        const DEFAULT: &str = "default";

        for item in &items[1..] {
            match *item {
                darling::export::NestedMeta::Meta(ref inner) => {
                    let name = ::darling::util::path_to_string(inner.path());
                    match name.as_str() {
                        MAP => {
                            if map.is_none() {
                                map = errors.handle(
                                    darling::FromMeta::from_meta(inner)
                                        .map_err(|e| {
                                            e.with_span(&inner).at(MAP)
                                        }),
                                );
                            } else {
                                errors.push(
                                    darling::Error::duplicate_field(MAP)
                                        .with_span(&inner),
                                );
                            }
                        }

                        DEFAULT => {
                            if default.is_none() {
                                default = errors.handle(
                                    darling::FromMeta::from_meta(inner)
                                        .map_err(|e| {
                                            e.with_span(&inner).at(DEFAULT)
                                        }),
                                );
                            } else {
                                errors.push(
                                    darling::Error::duplicate_field(DEFAULT)
                                        .with_span(&inner),
                                );
                            }
                        }

                        other => {
                            errors.push(
                                darling::Error::unknown_field_with_alts(
                                    other,
                                    &[MAP, DEFAULT],
                                )
                                .with_span(inner),
                            );
                        }
                    }
                }
                darling::export::NestedMeta::Lit(ref inner) => {
                    errors.push(
                        darling::Error::unsupported_format("literal")
                            .with_span(inner),
                    );
                }
            }
        }

        errors.finish()?;
        Ok(Self {
            path: path.unwrap(),
            map,
            default,
        })
    }
}

#[derive(Debug, Clone)]
struct OnEntry {
    ty: Path,
    map: Option<Path>,
    with: Option<Expr>,
    rename: Option<Ident>,
    skip: Option<bool>,
}

impl FromMeta for OnEntry {
    fn from_list(items: &[darling::ast::NestedMeta]) -> darling::Result<Self> {
        let mut errors = darling::Error::accumulator();
        let ty = match &items[0] {
            NestedMeta::Meta(syn::Meta::Path(path)) => Some(path.clone()),
            _ => {
                errors.push(
                    darling::Error::custom("Expected path as first argument.")
                        .with_span(&items[0]),
                );
                None
            }
        };

        let mut map = None;
        const MAP: &str = "map";
        let mut with = None;
        const WITH: &str = "with";
        let mut rename = None;
        const RENAME: &str = "rename";
        let mut skip = None;
        const SKIP: &str = "skip";

        for item in &items[1..] {
            match *item {
                darling::export::NestedMeta::Meta(ref inner) => {
                    let name = ::darling::util::path_to_string(inner.path());
                    match name.as_str() {
                        MAP => {
                            if with.is_some() {
                                errors.push(
                                    darling::Error::custom(format!(
                                        "{MAP} are conflicting with {WITH}"
                                    ))
                                    .with_span(&inner),
                                )
                            } else if map.is_none() {
                                map = errors.handle(
                                    darling::FromMeta::from_meta(inner)
                                        .map_err(|e| {
                                            e.with_span(&inner).at(MAP)
                                        }),
                                );
                            } else {
                                errors.push(
                                    darling::Error::duplicate_field(MAP)
                                        .with_span(&inner),
                                );
                            }
                        }
                        WITH => {
                            if map.is_some() {
                                errors.push(
                                    darling::Error::custom(format!(
                                        "{WITH} are conflicting with {MAP}"
                                    ))
                                    .with_span(&inner),
                                )
                            } else if with.is_none() {
                                with = errors.handle(
                                    darling::FromMeta::from_meta(inner)
                                        .map_err(|e| {
                                            e.with_span(&inner).at(WITH)
                                        }),
                                );
                            } else {
                                errors.push(
                                    darling::Error::duplicate_field(WITH)
                                        .with_span(&inner),
                                );
                            }
                        }
                        RENAME => {
                            if rename.is_none() {
                                rename = errors.handle(
                                    darling::FromMeta::from_meta(inner)
                                        .map_err(|e| {
                                            e.with_span(&inner).at(RENAME)
                                        }),
                                );
                            } else {
                                errors.push(
                                    darling::Error::duplicate_field(RENAME)
                                        .with_span(&inner),
                                );
                            }
                        }

                        SKIP => {
                            if skip.is_none() {
                                skip = errors.handle(
                                    darling::FromMeta::from_meta(inner)
                                        .map_err(|e| {
                                            e.with_span(&inner).at(SKIP)
                                        }),
                                );
                            } else {
                                errors.push(
                                    darling::Error::duplicate_field(SKIP)
                                        .with_span(&inner),
                                );
                            }
                        }
                        other => {
                            errors.push(
                                darling::Error::unknown_field_with_alts(
                                    other,
                                    &[MAP, WITH, RENAME, SKIP],
                                )
                                .with_span(inner),
                            );
                        }
                    }
                }
                darling::export::NestedMeta::Lit(ref inner) => {
                    errors.push(
                        darling::Error::unsupported_format("literal")
                            .with_span(inner),
                    );
                }
            }
        }

        errors.finish()?;
        Ok(Self {
            ty: ty.unwrap(),
            map,
            with,
            rename,
            skip,
        })
    }
}

pub fn derive_impl(
    input: DeriveInput,
) -> syn::Result<proc_macro2::TokenStream> {
    let AutoMapperReceiver {
        ident,
        generics,
        data,
        from: from_list,
        into: into_list,
    } = AutoMapperReceiver::from_derive_input(&input)
        .map_err(|e| syn::Error::new_spanned(&input, e.to_string()))?;

    let (impl_generics, ty_generics, where_clause) = generics.split_for_impl();

    let mut impl_blocks = Vec::with_capacity(from_list.len() + into_list.len());

    match data {
        Data::Struct(fields) => {
            for from in &from_list {
                let field_exprs = fields
                    .iter()
                    .map(|field| {
                        let on = get_on(&field.on, &from.path);
                        let field_name = field.ident.as_ref().unwrap();
                        let rename = on
                            .and_then(|x| x.rename.as_ref())
                            .map(|s| format_ident!("{s}"))
                            .unwrap_or(field_name.clone());

                        let right_hand_expr = if let Some(on) = on {
                            on.map
                                .as_ref()
                                .map(|ref map| quote! { #map(value.#rename) })
                                .or_else(|| {
                                    on.with
                                        .as_ref()
                                        .map(|value| quote! { #value })
                                })
                        } else {
                            from.map
                                .as_ref()
                                .map(|map| quote! { #map(value.#rename) })
                        }
                        .unwrap_or_else(|| quote! { value.#rename });

                        quote! {
                            #field_name: #right_hand_expr,
                        }
                    })
                    .collect_vec();

                let default_block = if let Some(true) = from.default {
                    Some(quote! {
                        ..Default::default()
                    })
                } else {
                    None
                };
                let path = &from.path;

                let block = quote! {
                    impl #impl_generics From<#path> for #ident #ty_generics #where_clause  {
                        fn from(value: #path) -> Self {
                            Self {
                                #(#field_exprs)*
                                #default_block
                            }
                        }
                    }
                };

                impl_blocks.push(block);
            }

            let input_ident: Ident = format_ident!("value");
            for into in &into_list {
                let field_exprs = fields
                    .iter()
                    .filter_map(|field| {
                        let on = get_on(&field.on, &into.path);
                        if let Some(true) = on.and_then(|x| x.skip) {
                            return None;
                        }
                        let field_name = field.ident.as_ref().unwrap();
                        let rename = on
                            .and_then(|x| x.rename.as_ref())
                            .map(|s| format_ident!("{s}"))
                            .unwrap_or(field_name.clone());

                        let right_hand_expr = if let Some(on) = on
                            && let Some(map) = &on.map
                        {
                            quote! { #map(#input_ident.#rename) }
                        } else if let Some(on) = on
                            && let Some(with) = &on.with
                        {
                            quote! { #with }
                        } else if let Some(map) = &into.map {
                            quote! { #map(#input_ident.#rename) }
                        } else {
                            quote! { #input_ident.#rename }
                        };

                        Some(quote! {
                            #field_name: #right_hand_expr,
                        })
                    })
                    .collect_vec();

                let default_block = if let Some(true) = into.default {
                    Some(quote! {
                        ..Default::default()
                    })
                } else {
                    None
                };
                let path = &into.path;

                let block = quote! {
                    impl #impl_generics From<#ident #ty_generics> for #path #where_clause  {
                        fn from(#input_ident: #ident #ty_generics) -> #path {
                            #path {
                                #(#field_exprs)*
                                #default_block
                            }
                        }
                    }
                };

                impl_blocks.push(block);
            }
        }
        Data::Enum(_items) => unreachable!(),
    }

    Ok(quote! {
        #(#impl_blocks)*
    })
}

fn get_on<'a>(iter: &'a [OnEntry], path: &'a Path) -> Option<&'a OnEntry> {
    iter.iter().find(|OnEntry { ty, .. }| ty == path)
}
