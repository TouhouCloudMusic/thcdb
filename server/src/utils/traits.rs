#![expect(dead_code)]

pub trait MapInto<Target> {
    fn map_into(self) -> Target;
}

impl<T, U, E, F> MapInto<Result<U, F>> for Result<T, E>
where
    T: Into<U>,
    E: Into<F>,
{
    fn map_into(self) -> Result<U, F> {
        match self {
            Ok(t) => Ok(t.into()),
            Err(e) => Err(e.into()),
        }
    }
}

impl<T, U> MapInto<Vec<U>> for Vec<T>
where
    T: Into<U>,
{
    fn map_into(self) -> Vec<U> {
        self.into_iter().map(Into::into).collect()
    }
}

impl<A, B> MapInto<Option<B>> for Option<A>
where
    A: Into<B>,
{
    fn map_into(self) -> Option<B> {
        self.map(std::convert::Into::into)
    }
}

pub trait Pipe<O>
where
    Self: Sized,
{
    fn pipe(self, f: impl FnOnce(Self) -> O) -> O {
        f(self)
    }
}

impl<T, O> Pipe<O> for T {}

pub trait Reverse<O> {
    #[doc(alias = "reverse")]
    fn rev(self) -> O;
}

impl<A, B> Reverse<(B, A)> for (A, B) {
    fn rev(self) -> (B, A) {
        (self.1, self.0)
    }
}

pub trait Tap
where
    Self: Sized,
{
    fn tap(self, f: impl FnOnce(&Self)) -> Self {
        f(&self);
        self
    }
}

impl<T> Tap for T {}

pub trait TapMut
where
    Self: Sized,
{
    fn tap_mut(mut self, f: impl FnOnce(&mut Self)) -> Self {
        f(&mut self);
        self
    }
}

impl<T> TapMut for T {}

pub trait Intersection<'a, Rhs, Intersect> {
    fn intersects(&'a self, other: Rhs) -> bool;
    fn intersection(&'a self, other: Rhs) -> Intersect;
}

impl<'a, T, Lhs, Rhs> Intersection<'a, Rhs, Vec<&'a T>> for Lhs
where
    Lhs: AsRef<[T]>,
    Rhs: AsRef<[T]>,
    T: PartialEq,
{
    fn intersects(&self, other: Rhs) -> bool {
        self.as_ref().iter().any(|el| other.as_ref().contains(el))
    }

    fn intersection(&self, other: Rhs) -> Vec<&T> {
        let mut result = Vec::new();
        for item in self.as_ref() {
            if other.as_ref().contains(item) && !result.contains(&item) {
                result.push(item);
            }
        }
        result
    }
}

pub trait Len {
    type Len: PartialOrd;
    const EMPTY: Self::Len;

    fn len(&self) -> Self::Len;

    fn is_empty(&self) -> bool {
        self.len() == Self::EMPTY
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

pub trait NonEmpty: Sized {
    fn non_empty(self) -> Option<Self>;
    fn non_empty_or<E>(self, err: E) -> Result<Self, E>;
    fn non_empty_or_else<E>(self, err: impl FnOnce() -> E) -> Result<Self, E>;
    fn non_empty_then<T>(self, f: impl FnOnce(Self) -> T) -> Option<T>;
}

impl<T> NonEmpty for T
where
    T: Len + Sized,
{
    fn non_empty(self) -> Option<Self> {
        (!self.is_empty()).then_some(self)
    }

    fn non_empty_or<E>(self, err: E) -> Result<Self, E> {
        self.non_empty().ok_or(err)
    }

    fn non_empty_or_else<E>(self, err: impl FnOnce() -> E) -> Result<Self, E> {
        self.non_empty().ok_or_else(err)
    }

    fn non_empty_then<U>(self, f: impl FnOnce(Self) -> U) -> Option<U> {
        if self.is_empty() { None } else { Some(f(self)) }
    }
}

impl<T> NonEmpty for &[T] {
    fn non_empty(self) -> Option<Self> {
        (!self.is_empty()).then_some(self)
    }

    fn non_empty_or<E>(self, err: E) -> Result<Self, E> {
        self.non_empty().ok_or(err)
    }

    fn non_empty_or_else<E>(self, err: impl FnOnce() -> E) -> Result<Self, E> {
        self.non_empty().ok_or_else(err)
    }

    fn non_empty_then<U>(self, f: impl FnOnce(Self) -> U) -> Option<U> {
        if self.is_empty() { None } else { Some(f(self)) }
    }
}
