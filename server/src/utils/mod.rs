pub mod orm;

pub mod openapi {

    #[derive(Debug)]
    pub enum ContentType {
        Json,
    }

    impl std::fmt::Display for ContentType {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            match self {
                Self::Json => write!(f, "application/json"),
            }
        }
    }

    impl From<ContentType> for String {
        fn from(val: ContentType) -> Self {
            val.to_string()
        }
    }
}

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
