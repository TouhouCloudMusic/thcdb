use std::fmt::Display;

pub trait Len {
    type Len: PartialOrd;
    const EMPTY: Self::Len;

    fn len(&self) -> Self::Len;

    fn is_empty(&self) -> bool {
        self.len() == Self::EMPTY
    }
}

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

impl Len for String {
    type Len = usize;

    const EMPTY: Self::Len = 0;

    fn len(&self) -> Self::Len {
        self.len()
    }
}

impl<T> Len for Vec<T> {
    type Len = usize;

    const EMPTY: Self::Len = 0;

    fn len(&self) -> Self::Len {
        self.len()
    }
}

impl<T> Len for [T] {
    type Len = usize;

    const EMPTY: Self::Len = 0;

    fn len(&self) -> Self::Len {
        self.len()
    }
}
