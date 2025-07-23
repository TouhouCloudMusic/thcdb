use std::hint::black_box;

use atoi::FromRadix10;
use criterion::{Criterion, criterion_group, criterion_main};
use memchr::memchr;

criterion_group!(benches, find_colon_bench, parse_num_bench);
criterion_main!(benches);

fn find_colon_bench(c: &mut Criterion) {
    const VALID_COLON_INPUT: &[u8] = "01:10.12".as_bytes();
    const INVALID_COLON_INPUT: &[u8] = " ab.cde".as_bytes();
    let mut group = c.benchmark_group("find_colon_valid");

    group.bench_function("iter", |b| {
        b.iter(|| find_colon_iter(black_box(VALID_COLON_INPUT)))
    });

    group.bench_function("while", |b| {
        b.iter(|| find_colon_while(black_box(VALID_COLON_INPUT)))
    });

    group.bench_function("memchr", |b| {
        b.iter(|| find_colon_index_simd(black_box(VALID_COLON_INPUT)))
    });

    group.finish();

    let mut group = c.benchmark_group("find_colon_invalid");

    group.bench_function("iter", |b| {
        b.iter(|| find_colon_iter(black_box(VALID_COLON_INPUT)))
    });

    group.bench_function("while", |b| {
        b.iter(|| find_colon_while(black_box(INVALID_COLON_INPUT)))
    });

    group.bench_function("memchr", |b| {
        b.iter(|| find_colon_index_simd(black_box(INVALID_COLON_INPUT)))
    });

    group.finish();
}

#[inline]
fn find_colon_iter(input: &[u8]) -> Option<usize> {
    input.iter().position(|&b| b == b':')
}

#[inline]
fn find_colon_while(input: &[u8]) -> Option<usize> {
    let mut i = 0;

    while i < input.len() {
        if input[i] == b':' {
            return Some(i);
        }

        i += 1;
    }

    None
}

#[inline]
fn find_colon_index_simd(input: &[u8]) -> Option<usize> {
    memchr(b':', input)
}

fn parse_num_bench(c: &mut Criterion) {
    const INPUT: &str = "13";
    const INVALID_INPUT: &str = "1a";

    let bytes = INPUT.as_bytes();

    let mut group = c.benchmark_group("parse_num");

    group.bench_function("std", |b| b.iter(|| parse_num_std(black_box(INPUT))));

    group.bench_function("while", |b| b.iter(|| parse_num(black_box(bytes))));

    group.bench_function("atoi", |b| {
        b.iter(|| parse_num_atoi(black_box(bytes)))
    });

    group.bench_function("atoi_simd", |b| {
        b.iter(|| parse_num_atoi_simd(black_box(bytes)))
    });

    group.bench_function("lexical", |b| {
        b.iter(|| parse_num_lexical(black_box(bytes)))
    });

    group.finish();

    let bytes: &[u8] = INVALID_INPUT.as_bytes();

    let mut group = c.benchmark_group("parse_num_invalid");

    group.bench_function("std", |b| {
        b.iter(|| parse_num_std(black_box(INVALID_INPUT)))
    });

    group.bench_function("while", |b| b.iter(|| parse_num(black_box(bytes))));

    group.bench_function("atoi", |b| {
        b.iter(|| parse_num_atoi(black_box(bytes)))
    });

    group.bench_function("atoi_simd", |b| {
        b.iter(|| parse_num_atoi_simd(black_box(bytes)))
    });

    group.bench_function("lexical", |b| {
        b.iter(|| parse_num_lexical(black_box(bytes)))
    });

    group.finish();
}

#[inline]
fn parse_num(b: &[u8]) -> Option<usize> {
    let mut num = 0usize;
    for &b in b {
        if !b.is_ascii_digit() {
            return None;
        }
        num = num * 10 + (b - b'0') as usize;
    }
    Some(num)
}

#[inline]
fn parse_num_std(b: &str) -> Option<usize> {
    b.parse().ok()
}

#[inline]
fn parse_num_atoi(b: &[u8]) -> Option<usize> {
    match usize::from_radix_10(b) {
        (_, 0) => None,
        (num, _) => Some(num),
    }
}

#[inline]
fn parse_num_atoi_simd(b: &[u8]) -> Option<usize> {
    atoi_simd::parse::<usize>(b).ok()
}

#[inline]
fn parse_num_lexical(b: &[u8]) -> Option<usize> {
    lexical_core::parse::<usize>(b).ok()
}

// #[inline]
// fn split_sec_and_milli(b: &[u8]) -> Option<(&[u8], &[u8])> {
//     let mut parts = b.split(|&b| b == b'.');
//     let sec = parts.next()?;
//     let milli = parts.next()?;

//     Some((sec, milli))
// }
