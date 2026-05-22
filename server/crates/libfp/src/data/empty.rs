use std::collections::{HashMap, HashSet};
use std::hash::BuildHasher;

pub trait Empty {
    fn is_empty(&self) -> bool;
}

impl Empty for () {
    fn is_empty(&self) -> bool {
        true
    }
}

impl<T> Empty for Option<T> {
    fn is_empty(&self) -> bool {
        self.is_none()
    }
}

impl<T> Empty for Vec<T> {
    fn is_empty(&self) -> bool {
        self.is_empty()
    }
}

impl<T> Empty for &[T] {
    fn is_empty(&self) -> bool {
        self.iter().next().is_none()
    }
}

impl<T> Empty for [T] {
    fn is_empty(&self) -> bool {
        self.is_empty()
    }
}

impl<T, S: BuildHasher> Empty for HashSet<T, S> {
    fn is_empty(&self) -> bool {
        self.is_empty()
    }
}

impl<K, V, S: BuildHasher> Empty for HashMap<K, V, S> {
    fn is_empty(&self) -> bool {
        self.is_empty()
    }
}

pub trait EmptyExt: Sized {
    fn into_option(self) -> Option<Self>;
}

impl<T> EmptyExt for T
where
    T: Empty + Sized,
{
    fn into_option(self) -> Option<Self> {
        (!self.is_empty()).then_some(self)
    }
}
