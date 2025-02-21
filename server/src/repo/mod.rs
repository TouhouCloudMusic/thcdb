pub mod artist;
pub mod correction;
pub mod label;
pub mod release;
pub mod song;
pub mod tag;
pub mod user;

mod utils {
    macro_rules! relation_enum {
        ($name:ident {$($rel:ident),* $(,)?}, $arr_name:ident) => {

            enum $name {
                $(
                    $rel
                ),*
            }

            const $arr_name : [$name; {
                std::mem::variant_count::<$name>()
            }] = [
                $($name::$rel),*
            ];
        };
    }

    pub(super) use relation_enum;
}
