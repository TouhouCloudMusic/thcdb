pub mod artist;
pub mod lookup_table;

// pub mod share {
//     use std::sync::LazyLock;

//     use chrono::Datelike;

//     static THIS_YEAR: LazyLock<i16> =
//         LazyLock::new(|| chrono::Local::now().year().try_into().unwrap());
//     pub struct Year(i16);

//     impl Year {}

//     pub enum TryIntoYearError {
//         LargerThanThisYear,
//     }

//     impl TryFrom<i16> for Year {
//         type Error = TryIntoYearError;

//         fn try_from(value: i16) -> Result<Self, Self::Error> {
//             if value > *THIS_YEAR {
//                 Err(TryIntoYearError::LargerThanThisYear)
//             } else {
//                 Ok(Year(value))
//             }
//         }
//     }

//     impl Into<i16> for Year {
//         fn into(self) -> i16 {
//             self.0
//         }
//     }
// }
