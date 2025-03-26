use darling::{FromDeriveInput, FromField};
use quote::quote;
use syn::DeriveInput;

#[derive(FromDeriveInput)]
#[darling(supports(struct_named))]
pub struct InputStruct {
    ident: syn::Ident,
    data: darling::ast::Data<(), InputField>,
}

#[derive(FromField)]
#[darling(attributes(from_ref_arc))]
pub struct InputField {
    ident: Option<syn::Ident>,
    ty: syn::Type,
    #[darling(default)]
    skip: bool,
}

pub fn derive_from_ref_arc_impl(
    input: DeriveInput,
) -> syn::Result<proc_macro2::TokenStream> {
    let data = InputStruct::from_derive_input(&input)?;
    let ident = data.ident;
    let fields = match data.data {
        darling::ast::Data::Struct(fields) => fields,
        darling::ast::Data::Enum(_) => panic!("impossible"),
    };

    let impls = fields.into_iter().map(|field| {
        if field.skip {
            return None;
        }
        let ty = field.ty;
        let field_name = field.ident.unwrap();

        Some(quote! {
            impl ::axum::extract::FromRef<::std::sync::Arc<#ident>> for #ty {
                fn from_ref(arc: &::std::sync::Arc<#ident>) -> Self {
                    arc.#field_name.clone()
                }
            }
        })
    });

    Ok(quote! {
        #(#impls)*
    })
}
