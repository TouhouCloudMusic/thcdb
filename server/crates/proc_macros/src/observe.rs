use proc_macro2::TokenStream;
use quote::{quote, quote_spanned};
use syn::parse::{Parse, ParseStream};
use syn::{Expr, ItemFn, LitStr, Path, Stmt, Token};

#[cfg(test)]
mod tests;

pub struct Args {
    name: LitStr,
    runtime: Path,
}

impl Parse for Args {
    fn parse(input: ParseStream<'_>) -> syn::Result<Self> {
        let name = input.parse()?;
        let mut runtime = syn::parse_quote!(::infra_db);
        if !input.is_empty() {
            input.parse::<Token![,]>()?;
            if !input.is_empty() {
                input.parse::<Token![crate]>()?;
                input.parse::<Token![=]>()?;
                runtime = input.parse::<Path>()?;
                if input.peek(Token![,]) {
                    input.parse::<Token![,]>()?;
                }
            }
        }
        Ok(Self { name, runtime })
    }
}

pub fn expand(args: &Args, mut function: ItemFn) -> syn::Result<TokenStream> {
    let Args { name, runtime } = args;
    let body = &function.block;
    let future = if function.sig.asyncness.is_some() {
        quote! { async #body }
    } else {
        match body.stmts.as_slice() {
            [Stmt::Expr(expression @ Expr::Call(_), None)] => {
                quote! {
                    {
                        let future = #expression;
                        async move { future.await.map_err(|error| error.into()) }
                    }
                }
            }
            _ => {
                return Err(syn::Error::new_spanned(
                    body,
                    "observe requires an async function or a function returning a single future call",
                ));
            }
        }
    };
    let observed =
        quote_spanned! {name.span()=> #runtime::observe(#name, #future) };
    function.block = if function.sig.asyncness.is_some() {
        syn::parse_quote!({ #observed.await })
    } else {
        syn::parse_quote!({ #observed })
    };
    Ok(quote! { #function })
}
