use super::expand;

#[test]
fn synchronous_statements_are_rejected() {
    let result = expand(
        &syn::parse_quote!("test.operation"),
        syn::parse_quote! {
            fn operation() -> impl Future<Output = Result<(), Error>> {
                let value = prepare();
                execute(value)
            }
        },
    );
    assert!(result.is_err());
}
