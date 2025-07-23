use std::fmt::Write;

use smallvec::smallvec;

use super::*;

#[test]
fn valid_lyric() {
    let res = parse_line("[01:01.00]aaa");
    assert!(res.is_ok());
    let lyric = res.unwrap().unwrap().lyric().unwrap();
    assert_eq!(lyric.timestamps[0], 61000);
    assert_eq!(lyric.text, "aaa");
    let res = parse_line("[01:01.00][01:01.01]aaa");
    assert!(res.is_ok());
    let lyric = res.unwrap().unwrap().lyric().unwrap();
    assert_eq!(lyric.timestamps[0], 61000);
    assert_eq!(lyric.timestamps[1], 61010);
    assert_eq!(lyric.text, "aaa");

    let res = parse_line("[01:01.00] [01:01.01]aaa");
    assert!(res.is_ok());
    let lyric = res.unwrap().unwrap().lyric().unwrap();
    assert_eq!(lyric.timestamps[0], 61000);
    assert_eq!(lyric.text, " [01:01.01]aaa");
}

#[test]
fn invalid_lyric() {
    let res = parse_line("[");
    assert!(res.is_err());
}

#[test]
fn valid_meta() {
    let res = parse_line("[kk:vv]");
    assert!(res.is_ok());
    let (key, value) = res.unwrap().unwrap().meta().unwrap();
    assert_eq!(key, "kk");
    assert_eq!(value, "vv");
    let res = parse_line("[kk:v          v]");
    assert!(res.is_ok());
    let (key, value) = res.unwrap().unwrap().meta().unwrap();
    assert_eq!(key, "kk");
    assert_eq!(value, "v          v");
    let res = parse_line("[a啊啊啊:b吧吧吧]");
    assert!(res.is_ok());
    let (key, value) = res.unwrap().unwrap().meta().unwrap();
    assert_eq!(key, "a啊啊啊");
    assert_eq!(value, "b吧吧吧");
}

#[test]
fn invalid_meta() {
    let res = parse_line("[ kk:vv]");
    assert!(res.is_err());
    let res = parse_line("[kk :vv]");
    assert!(res.is_err());
    let res = parse_line("[ kk :vv]");
    assert!(res.is_err());
    let res = parse_line("[kk: vv]");
    assert!(res.is_err());
    let res = parse_line("[kk:vv ]");
    assert!(res.is_err());
    let res = parse_line("[kk: vv ]");
    assert!(res.is_err());
    let res = parse_line("[kk:]");
    assert!(res.is_err());
}

#[test]
fn valid_timestamp() {
    let res = parse_timestamp(b"01:01");
    assert!(res.is_some());
    assert_eq!(res.unwrap(), 60000 + 1000);
    let res = parse_timestamp(b"01:01.1");
    assert!(res.is_some());
    assert_eq!(res.unwrap(), 60000 + 1000 + 100);
    let res = parse_timestamp(b"01:01.00");
    assert!(res.is_some());
    assert_eq!(res.unwrap(), 60000 + 1000);
    let res = parse_timestamp(b"01:01.12");
    assert!(res.is_some());
    assert_eq!(res.unwrap(), 60000 + 1000 + 120);
    let res = parse_timestamp(b"01:01.123");
    assert!(res.is_some());
    assert_eq!(res.unwrap(), 60000 + 1000 + 123);
}

#[test]
fn invalid_timestamp() {
    let res = parse_timestamp(b"");
    assert!(res.is_none());

    let res = parse_timestamp(b"abc");
    assert!(res.is_none());

    let res = parse_timestamp(b"01:");
    assert!(res.is_none());

    let res = parse_timestamp(b":01");
    assert!(res.is_none());

    let res = parse_timestamp(b"01:01.");
    assert!(res.is_none());

    let res = parse_timestamp(b"01:01.a");
    assert!(res.is_none());
}

#[test]
fn lyrics_display() {
    let mut metadata = std::collections::BTreeMap::new();
    metadata.insert("ar", "周杰伦");
    metadata.insert("ti", "晴天");

    let lines = vec![
        Line {
            timestamps: smallvec![72_340],
            text: "第一行歌词".to_string(),
        }
        .into(),
        Line {
            timestamps: smallvec![25_670, 26_000],
            text: "第二行歌词".to_string(),
        }
        .into(),
    ];

    let lyrics = Lyrics { metadata, lines };

    let mut output = String::new();
    write!(&mut output, "{lyrics}").unwrap();

    let expected = "\
[ar:周杰伦]
[ti:晴天]
[01:12.340]第一行歌词
[00:25.670][00:26.000]第二行歌词
";

    assert_eq!(output, expected);
}
