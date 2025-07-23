use crate::hkt::HKT1;

pub trait Functor<A>: HKT1 {
    fn fmap<B>(self, f: impl FnMut(A) -> B) -> Self::Apply<B>;
}

impl<A> Functor<A> for Option<A> {
    fn fmap<B>(self, f: impl FnMut(A) -> B) -> Self::Apply<B> {
        self.map(f)
    }
}

impl<A> Functor<A> for Vec<A> {
    fn fmap<B>(self, f: impl FnMut(A) -> B) -> Self::Apply<B> {
        self.into_iter().map(f).collect()
    }
}

impl<A, Any> Functor<A> for Result<A, Any> {
    fn fmap<B>(self, f: impl FnMut(A) -> B) -> Self::Apply<B> {
        self.map(f)
    }
}

pub trait FunctorExt<A>: Functor<A> {
    fn fmap_into<B>(self) -> Self::Apply<B>
    where
        A: Into<B>;
}

impl<F, A> FunctorExt<A> for F
where
    F: Functor<A>,
{
    fn fmap_into<B>(self) -> Self::Apply<B>
    where
        A: Into<B>,
    {
        self.fmap(Into::into)
    }
}
