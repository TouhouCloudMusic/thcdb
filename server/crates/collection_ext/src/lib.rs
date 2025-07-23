pub trait Reverse<O> {
    fn reverse(self) -> O;
}

impl<A, B> Reverse<(B, A)> for (A, B) {
    fn reverse(self) -> (B, A) {
        (self.1, self.0)
    }
}

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
