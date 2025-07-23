pub trait HKT1 {
    type Apply<B>;
}

pub trait HKT2: HKT1 {
    type Apply2<D>;
}

impl<A> HKT1 for Option<A> {
    type Apply<B> = Option<B>;
}

impl<A> HKT1 for Vec<A> {
    type Apply<B> = Vec<B>;
}

impl<A, __> HKT1 for Result<A, __> {
    type Apply<B> = Result<B, __>;
}

impl<A, B> HKT2 for Result<A, B> {
    type Apply2<D> = Result<A, D>;
}
