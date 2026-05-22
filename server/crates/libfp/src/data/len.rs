use std::collections::{HashMap, HashSet};
use std::hash::BuildHasher;

#[expect(clippy::len_without_is_empty)]
pub trait Len {
    type Unit;
    fn len(&self) -> Self::Unit;
}

impl<T> Len for Vec<T> {
    type Unit = usize;
    #[inline]
    fn len(&self) -> Self::Unit {
        self.len()
    }
}

impl<T> Len for [T] {
    type Unit = usize;
    #[inline]
    fn len(&self) -> Self::Unit {
        self.len()
    }
}

impl<T> Len for &[T] {
    type Unit = usize;
    #[inline]
    fn len(&self) -> Self::Unit {
        self.iter().len()
    }
}

impl<K, V, S: BuildHasher> Len for HashMap<K, V, S> {
    type Unit = usize;
    #[inline]
    fn len(&self) -> Self::Unit {
        self.len()
    }
}

impl<V, S: BuildHasher> Len for HashSet<V, S> {
    type Unit = usize;
    #[inline]
    fn len(&self) -> Self::Unit {
        self.len()
    }
}
