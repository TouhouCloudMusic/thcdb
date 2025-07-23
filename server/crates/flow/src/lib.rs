pub trait Pipe<O>
where
    Self: Sized,
{
    fn pipe(self, f: impl FnOnce(Self) -> O) -> O {
        f(self)
    }
}

impl<T, O> Pipe<O> for T {}

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

pub trait Compose<A, B, C> {
    fn compose(self, f: impl FnOnce(B) -> C) -> impl FnOnce(A) -> C;
}

impl<A, B, C, F> Compose<A, B, C> for F
where
    F: FnOnce(A) -> B,
{
    fn compose(self, f: impl FnOnce(B) -> C) -> impl FnOnce(A) -> C {
        move |a| f(self(a))
    }
}

#[cfg(test)]
mod test {
    use crate::Compose;

    #[test]
    fn compose_fn_once() {
        let f = |x: i32| x.to_string();
        let g = |x: String| x.parse::<i32>().unwrap();
        let h = f.compose(g);
        assert_eq!(h(1), 1);
    }

    #[test]
    fn compose_fn() {
        fn f(x: i32) -> String {
            x.to_string()
        }
        fn g(x: String) -> i32 {
            x.parse::<i32>().unwrap()
        }
        let h = f.compose(g);
        assert_eq!(h(1), 1)
    }
}
