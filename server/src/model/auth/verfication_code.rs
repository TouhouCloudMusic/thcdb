use std::fmt::Display;

use itertools::Itertools;
use rand::Rng;

#[derive(Debug)]
pub struct VerificationCode<const N: usize> {
    digits: [u8; N],
}

impl<const N: usize> VerificationCode<N> {
    pub fn new() -> Self {
        let mut rng = rand::rng();

        let digits = std::array::from_fn(|_| rng.random_range(0..=9));

        Self { digits }
    }
}

impl<const N: usize> Display for VerificationCode<N> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.digits.iter().join(""))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    #[test]
    fn code_gen() {
        let code = VerificationCode::<6>::new();

        assert!(!code.digits.iter().all(|&d| d == code.digits[0]));
    }
}
