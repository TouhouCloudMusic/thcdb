const TS_HEADER: &str = "// Auto-generated from thcdb server\n\n";
const KT_HEADER: &str = "// Auto-generated from thcdb server\n\npackage net.hearnsoft.tcm.server.constants\n\n";

macro_rules! shared_constants {
    (
        $(
            $(#[$meta:meta])*
            $vis:vis const $name:ident: $ty:ty = $value:expr;
        )*
    ) => {
        $(
            $(#[$meta])*
            $vis const $name: $ty = $value;
        )*

        pub fn ts_constants() -> String {
            let mut content = String::from($crate::TS_HEADER);
            $(
                $crate::push_ts_constant(&mut content, stringify!($name), $name);
            )*
            content
        }

        pub fn kt_constants() -> String {
            let mut content = String::from($crate::KT_HEADER);
            $(
                $crate::push_kt_constant(&mut content, stringify!($name), $name);
            )*
            content
        }
    };
}

fn push_ts_constant<T: std::fmt::Debug>(
    content: &mut String,
    name: &str,
    value: T,
) {
    use std::fmt::Write as _;

    writeln!(content, "export const {name} = {value:?}")
        .expect("writing to String should not fail");
}

fn push_kt_constant<T: std::fmt::Debug>(
    content: &mut String,
    name: &str,
    value: T,
) {
    use std::fmt::Write as _;

    writeln!(content, "const val {name} = {value:?}")
        .expect("writing to String should not fail");
}

shared_constants! {
    pub const REQUEST_BODY_MAX_SIZE: usize = 26 * 1024 * 1024;

    pub const ENTITY_IDENT_MIN_LEN: usize = 1;
    pub const ENTITY_IDENT_MAX_LEN: usize = 128;

    // Artist
    pub const ARTIST_PROFILE_IMAGE_MIN_WIDTH: u32 = 256;
    pub const ARTIST_PROFILE_IMAGE_MAX_WIDTH: u32 = 4096;
    pub const ARTIST_PROFILE_IMAGE_MIN_HEIGHT: u32 = 256;
    pub const ARTIST_PROFILE_IMAGE_MAX_HEIGHT: u32 = 4096;
    pub const ARTIST_PROFILE_IMAGE_MAX_FILE_SIZE: u64 = 25 * 1024 * 1024;

    // Release
    pub const RELEASE_COVER_IMAGE_MIN_WIDTH: u32 = 256;
    pub const RELEASE_COVER_IMAGE_MAX_WIDTH: u32 = 4096;
    pub const RELEASE_COVER_IMAGE_MIN_HEIGHT: u32 = 256;
    pub const RELEASE_COVER_IMAGE_MAX_HEIGHT: u32 = 4096;

    // User
    pub const AVATAR_MAX_FILE_SIZE: u64 = 10 * 1024 * 1024; // 10 mib
    pub const AVATAR_MIN_FILE_SIZE: u64 = 10 * 1024; // 10 kib

    pub const USER_PROFILE_BANNER_MAX_WIDTH: u32 = 1500;
    pub const USER_PROFILE_BANNER_MIN_WIDTH: u32 = 600;
    pub const USER_PROFILE_BANNER_MAX_HEIGHT: u32 = 500;
    pub const USER_PROFILE_BANNER_MIN_HEIGHT: u32 = 200;

    // Note: if you modify these values, please also change the regexes below
    pub const USER_NAME_MIN_LENGTH: u8 = 1;
    pub const USER_NAME_MAX_LENGTH: u8 = 64;
    pub const USER_NAME_REGEX_STR: &str = r"^[\p{L}\p{N}_]{1,64}$";
    pub const USER_PASSWORD_MIN_LENGTH: u8 = 8;
    pub const USER_PASSWORD_MAX_LENGTH: u8 = 64;
    pub const USER_PASSWORD_REGEX_STR: &str =
        r"^[A-Za-z\d`~!@#$%^&*()\-_=+]{8,64}$";
}
