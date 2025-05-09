use proc_macro2::{TokenStream, TokenTree};
use quote::quote;

pub fn cmp_chain(input: proc_macro2::TokenStream) -> TokenStream {
    let tokens: Vec<TokenTree> = input.into_iter().collect();

    let mut comparisons = Vec::new();

    let mut i = 0;
    while i + 2 < tokens.len() {
        let left = &tokens[i];
        let op = &tokens[i + 1];
        let right = &tokens[i + 2];

        comparisons.push(quote! {
            (#left #op #right)
        });

        i += 2;
    }

    let mut result = comparisons[0].clone();
    for cmp in comparisons.iter().skip(1) {
        result = quote! {
            #result && #cmp
        };
    }

    result
}
