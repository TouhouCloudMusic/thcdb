use std::fmt::Display;

use libfp::Len;

pub struct InvalidLen<T: Len> {
    received: T::Unit,
}

impl<T> Display for InvalidLen<T>
where
    T: LenCheck,
    T::Unit: Display + PartialOrd,
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
    Self::Unit: PartialOrd,
{
    const MAX: Self::Unit;
    const MIN: Self::Unit;

    fn len_check(self) -> Result<Self, InvalidLen<Self>> {
        let len = self.len();
        if Self::MIN <= len || len <= Self::MAX {
            Ok(self)
        } else {
            Err(InvalidLen { received: len })
        }
    }
}
