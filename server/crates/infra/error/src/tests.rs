use std::error::Error;

use super::{BoxedError, ContextError, EntityNotFound, ResultExt};

#[test]
fn nested_contexts_keep_operation_order_and_the_original_cause()
-> Result<(), BoxedError> {
    let result =
        Err::<(), _>(EntityNotFound::new("Artist", 42)).context("load artist");
    let error = result.expect_err("the artist is missing");
    let error: BoxedError = Box::new(ContextError::new("helper", error));
    let error = ContextError::new("repo", error);

    let message = error.to_string();
    let repo = message
        .find(&format!("repo at {}:", file!()))
        .ok_or("missing repo call site")?;
    let helper = message
        .find(&format!("helper at {}:", file!()))
        .ok_or("missing helper call site")?;
    let step = message
        .find(&format!("load artist at {}:", file!()))
        .ok_or("missing step call site")?;
    assert!(repo < helper && helper < step);

    let mut source: &(dyn Error + 'static) = &error;
    while let Some(cause) = source.source() {
        source = cause;
    }
    assert!(
        source
            .downcast_ref::<EntityNotFound>()
            .is_some_and(|cause| cause.entity == "Artist" && cause.id == 42)
    );
    Ok(())
}
