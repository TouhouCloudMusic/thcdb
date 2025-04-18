use darling::{FromDeriveInput, FromField};
use proc_macro2::TokenStream;
use quote::{format_ident, quote};
use syn::{DeriveInput, Ident};

#[derive(Debug, FromDeriveInput)]
#[darling(supports(struct_named), attributes(field_enum))]
struct Metadata {
    ident: syn::Ident,
    #[darling(default = "ret_true")]
    name: bool,
    #[darling(default)]
    r#type: bool,
    data: darling::ast::Data<(), FieldAttr>,
}

#[derive(Debug, FromField)]
#[darling(attributes(field_enum))]
struct FieldAttr {
    ident: Option<syn::Ident>,
    rename: Option<String>,
    #[darling(default)]
    skip: bool,
}

pub fn derive_impl(input: DeriveInput) -> syn::Result<TokenStream> {
    let data = Metadata::from_derive_input(&input)?;

    let mut output = TokenStream::new();
    if data.name {
        output.extend(gen_names(&data)?);
    }
    if data.r#type {
        output.extend(gen_types(&data)?);
    }

    Ok(output)
}

fn gen_names(metadata: &Metadata) -> syn::Result<TokenStream> {
    let enum_name = format_ident!("{}FieldName", metadata.ident);

    let mut variants = Vec::new();
    let mut to_str_match_arms = Vec::new();

    for field in metadata.data.as_ref().take_struct().unwrap().fields {
        if field.skip {
            continue;
        }

        let (field_name, variant_name) = get_field_and_variant_names(field);

        variants.push(quote! { #variant_name });
        to_str_match_arms.push(quote! {
            Self::#variant_name => #field_name,
        });
    }

    let output = quote! {
        pub enum #enum_name {
            #( #variants, )*
        }

        impl #enum_name {
            pub fn as_str(&self) -> &'static str {
                match self {
                    #( #to_str_match_arms )*
                }
            }
        }

        impl std::fmt::Display for #enum_name {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "{}", match self {
                    #( #to_str_match_arms )*
                })
            }
        }

        impl AsRef<str> for #enum_name {
            fn as_ref(&self) -> &str {
                match self {
                    #( #to_str_match_arms )*
                }
            }
        }
    };

    Ok(output)
}

fn gen_types(_metadata: &Metadata) -> syn::Result<TokenStream> {
    unimplemented!()
}

fn pascal_case(s: impl AsRef<str>) -> String {
    s.as_ref()
        .split('_')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                Some(first) => first.to_uppercase().chain(chars).collect(),
                None => String::new(),
            }
        })
        .collect()
}

fn get_field_and_variant_names(field: &FieldAttr) -> (String, Ident) {
    let field_name = if let Some(rename) = &field.rename {
        rename.clone()
    } else {
        field.ident.as_ref().unwrap().to_string()
    };
    let variant_name = format_ident!("{}", pascal_case(&field_name));

    (field_name, variant_name)
}

fn ret_true() -> bool {
    true
}

#[cfg(test)]
mod test {
    #[test]
    fn test_pascal_case() {
        assert_eq!(super::pascal_case("hello"), "Hello");
        assert_eq!(super::pascal_case("foo_bar"), "FooBar");
        assert_eq!(super::pascal_case("a"), "A");
        assert_eq!(super::pascal_case("A"), "A");
    }

    #[test]
    fn test_get_field_and_variant_names() {
        let field = super::FieldAttr {
            ident: Some(syn::Ident::new(
                "foo_bar",
                proc_macro2::Span::call_site(),
            )),
            rename: None,
            skip: false,
        };
        let (field_name, variant_name) =
            super::get_field_and_variant_names(&field);
        assert_eq!(field_name, "foo_bar");
        assert_eq!(variant_name.to_string(), "FooBar");

        let field = super::FieldAttr {
            ident: Some(syn::Ident::new(
                "foo_bar",
                proc_macro2::Span::call_site(),
            )),
            rename: Some("baz".to_string()),
            skip: false,
        };
        let (field_name, variant_name) =
            super::get_field_and_variant_names(&field);
        assert_eq!(field_name, "baz");
        assert_eq!(variant_name.to_string(), "Baz");
    }
}
