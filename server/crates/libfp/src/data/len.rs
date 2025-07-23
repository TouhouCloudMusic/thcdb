use std::collections::{HashMap, HashSet};

#[allow(clippy::len_without_is_empty)]
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

impl<K, V> Len for HashMap<K, V> {
    type Unit = usize;
    #[inline]
    fn len(&self) -> Self::Unit {
        self.len()
    }
}

impl<V> Len for HashSet<V> {
    type Unit = usize;
    #[inline]
    fn len(&self) -> Self::Unit {
        self.len()
    }
}
