use std::fmt::Display;

use rand::Rng;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct VerificationCode<const N: usize> {
    digits: [u8; N],
}

impl<const N: usize> VerificationCode<N> {
    pub fn new() -> Self {
        let mut rng = rand::rng();

        let digits = std::array::from_fn(|_| rng.random_range(0..=9));

        Self { digits }
    }

    pub fn parse(input: &str) -> Option<Self> {
        if input.len() != N {
            return None;
        }

        let mut digits = [0; N];

        for (idx, byte) in input.bytes().enumerate() {
            if byte.is_ascii_digit() {
                digits[idx] = byte - b'0';
            } else {
                return None;
            }
        }

        Some(Self { digits })
    }

    pub fn as_ascii_bytes(&self) -> [u8; N] {
        self.digits.map(|b| b + b'0')
    }
}

impl<const N: usize> Display for VerificationCode<N> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        for digit in self.digits {
            digit.fmt(f)?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn parse_code() {
        let code = VerificationCode::<6>::parse("123456");

        assert_eq!(code.unwrap().to_string(), "123456");
    }

    #[test]
    fn parse_code_rejects_invalid_format() {
        assert!(VerificationCode::<6>::parse("12345").is_none());
        assert!(VerificationCode::<6>::parse("12345a").is_none());
    }
}
