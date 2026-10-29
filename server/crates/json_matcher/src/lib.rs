use googletest::description::Description;
use googletest::matcher::{Matcher, MatcherBase, MatcherResult};
use serde_json::Value;
pub use serde_json::json;

#[derive(MatcherBase)]
pub struct JsonMatcher(pub Value);

impl Matcher<&Value> for JsonMatcher {
    fn matches(&self, actual: &Value) -> MatcherResult {
        if matches_value(actual, &self.0) {
            MatcherResult::Match
        } else {
            MatcherResult::NoMatch
        }
    }

    fn describe(&self, matcher_result: MatcherResult) -> Description {
        match matcher_result {
            MatcherResult::Match => {
                format!("matches JSON value {}", self.0).into()
            }
            MatcherResult::NoMatch => {
                format!("does not match JSON value {}", self.0).into()
            }
        }
    }
}

#[macro_export]
macro_rules! matches_json {
    ($($json:tt)+) => {
        $crate::JsonMatcher($crate::json!($($json)+))
    };
}

fn matches_value(actual: &Value, expected: &Value) -> bool {
    match (actual, expected) {
        (Value::Object(actual), Value::Object(expected)) => {
            expected.iter().all(|(key, expected)| {
                actual
                    .get(key)
                    .is_some_and(|actual| matches_value(actual, expected))
            })
        }
        (Value::Array(actual), Value::Array(expected)) => {
            actual.len() == expected.len()
                && actual
                    .iter()
                    .zip(expected)
                    .all(|(actual, expected)| matches_value(actual, expected))
        }
        _ => actual == expected,
    }
}
