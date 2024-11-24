use core::fmt;
use juniper::{graphql_scalar, ScalarValue};
use serde::de::Error;
use serde::{de, Deserialize, Deserializer, Serialize};

#[derive(Debug, Clone, PartialEq, ScalarValue, Serialize)]
#[serde(untagged)]
pub enum GqlScalarValue {
    #[value(as_int, as_float)]
    SmallInt(i16),
    #[value(as_int, as_float)]
    Int(i32),
    BigInt(i64),
    #[value(as_float)]
    Float(f32),
    #[value(as_float)]
    Double(f64),
    #[value(as_str, as_string, into_string)]
    String(String),
    #[value(as_bool)]
    Boolean(bool),
}

impl<'de> Deserialize<'de> for GqlScalarValue {
    fn deserialize<D: Deserializer<'de>>(de: D) -> Result<Self, D::Error> {
        struct Visitor;

        impl<'de> de::Visitor<'de> for Visitor {
            type Value = GqlScalarValue;

            fn expecting(&self, f: &mut fmt::Formatter) -> fmt::Result {
                f.write_str("a valid input value")
            }

            fn visit_bool<E: de::Error>(
                self,
                b: bool,
            ) -> Result<Self::Value, E> {
                Ok(GqlScalarValue::Boolean(b))
            }

            fn visit_i16<E: de::Error>(self, n: i16) -> Result<Self::Value, E> {
                Ok(GqlScalarValue::SmallInt(n))
            }

            fn visit_i32<E: de::Error>(self, n: i32) -> Result<Self::Value, E> {
                Ok(GqlScalarValue::Int(n))
            }

            fn visit_i64<E: de::Error>(self, n: i64) -> Result<Self::Value, E> {
                if n <= i64::from(i32::MAX) {
                    self.visit_i32(n.try_into().unwrap())
                } else {
                    Ok(GqlScalarValue::BigInt(n))
                }
            }

            fn visit_u32<E: de::Error>(self, n: u32) -> Result<Self::Value, E> {
                if n <= i32::MAX as u32 {
                    self.visit_i32(n as i32)
                } else {
                    self.visit_u64(u64::from(n))
                }
            }

            fn visit_u64<E: de::Error>(self, n: u64) -> Result<Self::Value, E> {
                if n <= i64::MAX as u64 {
                    self.visit_i64(n as i64)
                } else {
                    // Browser's `JSON.stringify()` serialize all numbers
                    // having no fractional part as integers (no decimal
                    // point), so we must parse large integers as floating
                    // point, otherwise we would error on transferring large
                    // floating point numbers.
                    Ok(GqlScalarValue::Double(n as f64))
                }
            }

            fn visit_f32<E>(self, v: f32) -> Result<Self::Value, E>
            where
                E: Error,
            {
                Ok(GqlScalarValue::Float(v))
            }

            fn visit_f64<E: de::Error>(self, f: f64) -> Result<Self::Value, E> {
                Ok(GqlScalarValue::Double(f))
            }

            fn visit_str<E: de::Error>(
                self,
                s: &str,
            ) -> Result<Self::Value, E> {
                self.visit_string(s.into())
            }

            fn visit_string<E: de::Error>(
                self,
                s: String,
            ) -> Result<Self::Value, E> {
                Ok(GqlScalarValue::String(s))
            }
        }

        de.deserialize_any(Visitor)
    }
}

#[graphql_scalar]
#[graphql(
    with = i16_scalar,
    parse_token(i16),
    scalar = GqlScalarValue,
)]
type MyI16 = i16;

mod i16_scalar {
    use super::{GqlScalarValue, MyI16};
    use juniper::{InputValue, Value};

    pub(super) fn to_output(value: &MyI16) -> Value<GqlScalarValue> {
        Value::Scalar(GqlScalarValue::SmallInt(*value))
    }

    pub(super) fn from_input(
        input: &InputValue<GqlScalarValue>,
    ) -> Result<MyI16, String> {
        match *input {
            InputValue::Scalar(GqlScalarValue::SmallInt(n)) => Ok(n),
            _ => Err("Invalid input".to_string()),
        }
    }
}
