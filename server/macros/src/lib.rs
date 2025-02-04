pub use proc_macros::*;

#[macro_export]
macro_rules! impl_from {
    (
        $from:path > $target:path
        {$($struct:tt)*}
        $(,)?
    ) => {
        impl_from!(@inner $from, $target, {$($struct)*});
    };

    (
        $from:path >
        $target:path
        {$($struct:tt)*},
        $fn:path
        $(,)?
    ) => {
        impl_from!(@inner_with_fn $from, $target, {$($struct)*}, $fn);
    };

    (
        $from:path >
        [ $($target:path),+ ]
        $tt:tt
    ) => {
        $(
            impl_from!(@inner $from, $target, $tt);
        )+
    };

    (
        $from:path >
        [ $($target:path),+ ]
        $tt:tt,
        $fn:path
        $(,)?
    ) => {
        $(
            impl_from!(@inner_with_fn $from, $target, $tt, $fn);
        )+
    };

    (@inner
        $from:path,
        $target:path,
        {
            $($(,)?
                $eq_field:ident),*
            $($(,)?
                => $from_field:ident $to_field:ident),*
            $($(,)?
                : $custome_field:ident $value:expr),*
            $(,)?
        }
        $(,)?
    ) => {
        impl From<&$from> for $target {
            fn from(value: &$from) -> Self {
                Self {
                    $( $eq_field: value.$eq_field.clone(), )*
                    $( $to_field: value.$from_field.clone(), )*
                    $( $custome_field: $value, )*
                }
            }
        }

        impl From<$from> for $target {
            fn from(value: $from) -> Self {
                Self {
                    $( $eq_field: value.$eq_field, )*
                    $( $to_field: value.$from_field, )*
                    $( $custome_field: $value, )*
                }
            }
        }
    };

    (@inner_with_fn
        $from:path,
        $target:path,
        {
            $($(,)?
                $eq_field:ident),*
            $($(,)?
                => $from_field:ident $to_field:ident),*
            $($(,)?
                : $custome_field:ident $value:expr),*
            $(,)?
        },
        $fn:path
        $(,)?
    ) => {

        impl From<&$from> for $target {
            fn from(value: &$from) -> Self {
                Self {
                    $( $eq_field: $fn(value.$eq_field.clone()), )*
                    $( $to_field: $fn(value.$from_field.clone()), )*
                    $( $custome_field: $value, )*
                }
            }
        }

        impl From<$from> for $target {
            fn from(value: $from) -> Self {
                Self {
                    $( $eq_field: $fn(value.$eq_field), )*
                    $( $to_field: $fn(value.$from_field), )*
                    $( $custome_field: $value, )*
                }
            }
        }

    };

}
