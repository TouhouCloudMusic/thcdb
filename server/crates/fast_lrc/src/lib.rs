use std::collections::BTreeMap;
use std::fmt::Display;

pub use error::{Error, ErrorKind};
use memchr::*;
use smallvec::SmallVec;

mod error;
#[cfg(test)]
mod tests;

#[derive(Debug, PartialEq, Eq)]
enum TypedLine<'a> {
    Meta { key: &'a str, value: &'a str },
    Lyric(LineRef<'a>),
}

impl<'a> TypedLine<'a> {
    #[allow(dead_code, reason = "Used in tests")]
    fn meta(self) -> Option<(&'a str, &'a str)> {
        match self {
            TypedLine::Meta { key, value } => Some((key, value)),
            _ => None,
        }
    }

    #[allow(dead_code, reason = "Used in tests")]
    fn lyric(self) -> Option<LineRef<'a>> {
        match self {
            TypedLine::Lyric(x) => Some(x),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LineRef<'a> {
    // Timestamp in milliseconds
    pub timestamps: SmallVec<[usize; 5]>,
    pub text: &'a str,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Line {
    pub timestamps: SmallVec<[usize; 5]>,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CowLine<'a> {
    Owned(Line),
    Borrowed(LineRef<'a>),
}

impl<'a> CowLine<'a> {
    pub fn timestamps(&self) -> &[usize] {
        match self {
            CowLine::Owned(x) => &x.timestamps,
            CowLine::Borrowed(x) => &x.timestamps,
        }
    }

    pub fn text(&self) -> &str {
        match self {
            CowLine::Owned(x) => &x.text,
            CowLine::Borrowed(x) => x.text,
        }
    }
}

impl From<Line> for CowLine<'_> {
    fn from(value: Line) -> Self {
        CowLine::Owned(value)
    }
}

impl<'a> From<LineRef<'a>> for CowLine<'a> {
    fn from(value: LineRef<'a>) -> Self {
        CowLine::Borrowed(value)
    }
}

#[derive(Debug)]
pub struct Lyrics<'a> {
    pub metadata: BTreeMap<&'a str, &'a str>,
    pub lines: Vec<CowLine<'a>>,
}

impl<'a> Lyrics<'a> {
    pub fn new() -> Self {
        Self {
            metadata: BTreeMap::new(),
            lines: Vec::new(),
        }
    }

    pub fn parse(content: &'a str) -> Result<Self, Error> {
        parse_lrc(content)
    }
}

impl Default for Lyrics<'_> {
    fn default() -> Self {
        Self::new()
    }
}

impl Display for Lyrics<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        for (key, value) in &self.metadata {
            writeln!(f, "[{key}:{value}]")?;
        }

        for line in &self.lines {
            for &ts in line.timestamps() {
                let minutes = ts / 60000;
                let seconds = (ts / 1000) % 60;
                let millis = ts % 1000;
                write!(f, "[{minutes:02}:{seconds:02}.{millis:03}]")?;
            }
            writeln!(f, "{}", line.text())?;
        }

        Ok(())
    }
}

#[inline]
fn parse_lrc(content: &'_ str) -> Result<Lyrics<'_>, Error> {
    let mut metadata = BTreeMap::new();
    let mut lines = Vec::new();

    let mut in_metadata = true;

    let line_break_idxes = memchr_iter(b'\n', content.as_bytes());

    let mut curr_idx = 0;
    for (i, line_break_idx) in line_break_idxes.enumerate() {
        let line = &content[curr_idx..line_break_idx].trim();
        curr_idx = line_break_idx + 1;
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        if let Some(v) = parse_line(line).map_err(|x| Error::new(x, i + 1))? {
            match v {
                TypedLine::Meta { key, value } => {
                    if !in_metadata {
                        return Err(Error::new(
                            ErrorKind::MetadataAfterLyrics,
                            i + 1,
                        ));
                    }

                    metadata.insert(key, value);
                }
                TypedLine::Lyric(line) => {
                    in_metadata = false;

                    lines.push(line.into())
                }
            }
        }
    }

    Ok(Lyrics { metadata, lines })
}

#[inline]
fn parse_line(line: &'_ str) -> Result<Option<TypedLine<'_>>, ErrorKind> {
    let bytes = line.as_bytes();

    // Skip invalid line
    if bytes[0] != b'[' {
        return Ok(None);
    }

    let colon_pos = find_char_index(b':', &bytes[1..])
        .ok_or(ErrorKind::InvalidTag)
        .map(|i| i + 1)?;

    let key = &bytes[1..colon_pos]; // between '[' and ':'
    if key.is_empty() {
        return Err(ErrorKind::InvalidTag);
    }

    if key[0].is_ascii_digit() {
        // if key.starts_with(|x: char| x.is_ascii_digit()) {
        return Ok(parse_lyric_line(line)?.map(TypedLine::Lyric));
    }

    if key.starts_with(b" ") || key.ends_with(b" ") {
        return Err(ErrorKind::InvalidTag);
    }

    // skip ':'
    let rest = &line[colon_pos + 1..];

    if rest.starts_with(' ') {
        return Err(ErrorKind::InvalidMetadata);
    }

    let bytes = rest.as_bytes();

    let end = memchr(b']', bytes).ok_or(ErrorKind::InvalidMetadata)?;

    let value = &bytes[..end];

    if value.is_empty() || value.ends_with(b" ") {
        return Err(ErrorKind::InvalidMetadata);
    }

    let key = &line[1..colon_pos];
    let value = &rest[..end];

    Ok(Some(TypedLine::Meta { key, value }))
}

#[inline]
fn parse_lyric_line(line: &str) -> Result<Option<LineRef<'_>>, ErrorKind> {
    let bytes = line.as_bytes();
    let mut timestamps = SmallVec::new();
    let mut cursor = 0;

    // parse multiple [00:00.00] tags
    while cursor < bytes.len() && bytes[cursor] == b'[' {
        let rest = &bytes[cursor + 1..];

        // find closing bracket
        let closing = if rest.len() > 14 {
            find_char_index(b']', &rest[5..14])
        } else {
            find_char_index(b']', &rest[5..])
        }
        .ok_or(ErrorKind::MissingBrackets)?;

        let timestamp_str = &rest[..closing + 5];

        let timestamp_ms = parse_timestamp(timestamp_str)
            .ok_or(ErrorKind::InvalidTimestamp)?;
        timestamps.push(timestamp_ms);

        cursor += closing + 5 + 2; // move past ']'
    }

    // Skip invalid line
    if timestamps.is_empty() {
        return Ok(None);
    }

    let text = &line[cursor..];
    Ok(Some(LineRef { timestamps, text }))
}

#[inline]
fn parse_timestamp(bytes: &[u8]) -> Option<usize> {
    let colon_idx = find_char_index(b':', bytes)?;

    let min_str = &bytes[..colon_idx];
    let sec_and_milli_str = &bytes[colon_idx + 1..];

    let minutes = atoi_simd::parse::<usize>(min_str).ok()? as usize;

    let len = sec_and_milli_str.len();
    let (seconds, millis) = match len {
        2 => (atoi_simd::parse::<usize>(sec_and_milli_str).ok()?, 0),
        4 => {
            let secounds =
                atoi_simd::parse::<usize>(&sec_and_milli_str[..2]).ok()?;
            let millis =
                atoi_simd::parse::<usize>(&sec_and_milli_str[3..]).ok()? * 100;
            // let millis = millis ;

            (secounds, millis)
        }
        5 => {
            let secounds =
                atoi_simd::parse::<usize>(&sec_and_milli_str[..2]).ok()?;
            let millis =
                atoi_simd::parse::<usize>(&sec_and_milli_str[3..]).ok()? * 10;
            // let millis = millis ;

            (secounds, millis)
        }
        6 => {
            let secounds =
                atoi_simd::parse::<usize>(&sec_and_milli_str[..2]).ok()?;
            let millis =
                atoi_simd::parse::<usize>(&sec_and_milli_str[3..]).ok()?;

            (secounds, millis)
        }
        _ => None?,
    };

    Some(minutes * 60_000 + seconds * 1000 + millis)
}

#[inline]
fn find_char_index(c: u8, bytes: &[u8]) -> Option<usize> {
    bytes.iter().position(|&x| x == c)
}
