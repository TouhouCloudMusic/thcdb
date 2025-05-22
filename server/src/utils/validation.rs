use std::fmt::Display;

use super::Len;

pub struct InvalidLen<T: Len> {
    received: T::Len,
}

impl<T> Display for InvalidLen<T>
where
    T: LenCheck,
    T::Len: Display,
{
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Invalid len, received: {}, min: {}, max: {}",
            self.received,
            T::MIN,
            T::MAX
        )
    }
}

pub trait LenCheck: Len
where
    Self: Sized,
{
    const MAX: Self::Len;
    const MIN: Self::Len;

    fn len_check(self) -> Result<Self, InvalidLen<Self>> {
        let len = self.len();
        if Self::MIN <= len || len <= Self::MAX {
            Ok(self)
        } else {
            Err(InvalidLen { received: len })
        }
    }
}
