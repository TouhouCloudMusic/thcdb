use crate::hkt::{HKT1, HKT2};

pub trait Bifunctor<A, B>: HKT2 + Sized {
    fn map_first<C>(self, f: impl FnMut(A) -> C) -> Self::Apply<C>;

    fn map_second<D>(self, f: impl FnMut(B) -> D) -> Self::Apply2<D>;

    fn bimap<C, D>(
        self,
        f: impl FnMut(A) -> C,
        g: impl FnMut(B) -> D,
    ) -> <Self::Apply<C> as HKT2>::Apply2<D>
    where
        <Self as HKT1>::Apply<C>: Bifunctor<C, B>,
    {
        self.map_first(f).map_second(g)
    }
}

impl<A, B> Bifunctor<A, B> for Result<A, B> {
    fn map_first<C>(self, f: impl FnMut(A) -> C) -> Self::Apply<C> {
        self.map(f)
    }

    fn map_second<D>(self, f: impl FnMut(B) -> D) -> Self::Apply2<D> {
        self.map_err(f)
    }
}

pub trait BifunctorExt<A, B>: Bifunctor<A, B> {
    fn bimap_into<C, D>(self) -> <Self::Apply<C> as HKT2>::Apply2<D>
    where
        Self: Sized,
        <Self as HKT1>::Apply<C>: Bifunctor<C, B>,
        A: Into<C>,
        B: Into<D>,
    {
        self.bimap(Into::into, Into::into)
    }
}

impl<A, B, T> BifunctorExt<A, B> for T where T: Bifunctor<A, B> {}
