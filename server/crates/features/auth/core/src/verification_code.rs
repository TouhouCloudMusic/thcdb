use std::fmt::Display;

use rand::Rng;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct VerificationCode<const N: usize> {
    digits: [u8; N],
}

impl<const N: usize> Default for VerificationCode<N> {
    fn default() -> Self {
        Self::new()
    }
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

impl<const N: usize> Serialize for VerificationCode<N> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.collect_str(self)
    }
}

impl<'de, const N: usize> Deserialize<'de> for VerificationCode<N> {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let input = String::deserialize(deserializer)?;
        Self::parse(&input).ok_or_else(|| {
            serde::de::Error::custom(format_args!(
                "expected a {N}-digit verification code"
            ))
        })
    }
}
