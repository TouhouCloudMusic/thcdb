use criterion::{
    BenchmarkId, Criterion, Throughput, black_box, criterion_group,
    criterion_main,
};
use fast_lrc::Lyrics as FastLyrics;
use lrc::Lyrics as LrcLyrics;
use rand::Rng;

// Sample LRC content for benchmarking
const SMALL_LRC: &str = r#"
[ar:艺术家]
[ti:歌曲标题]
[al:专辑]
[by:制作者]
[offset:0]

[00:12.34]第一行歌词
[00:25.67]第二行歌词
[01:30.12]第三行歌词
[02:45.89]第四行歌词
[03:15.23]第五行歌词
"#;

const MEDIUM_LRC: &str = r#"
[ar:东方Project]
[ti:幻想郷 ～ Lotus Land Story]
[al:蓮台野夜行]
[by:ZUN]
[offset:0]

[00:00.00]幻想の世界へようこそ
[00:15.34]桜舞い散る春の日に
[00:30.67]少女は夢を見ている
[00:45.12]永遠の時を求めて
[01:00.89]風が運ぶ物語
[01:15.23]月明かりの下で
[01:30.56]星座が語りかける
[01:45.78]運命の糸を紡いで
[02:00.12]希望の光を追いかけて
[02:15.45]愛と勇気を胸に
[02:30.78]新しい世界へ
[02:45.11]夢の扉を開けて
[03:00.44]永遠の歌声
[03:15.77]心に響く旋律
[03:30.10]幻想郷の物語
[03:45.43]終わりなき冒険
[04:00.76]希望の歌
[04:15.09]愛の詩
[04:30.42]夢の続き
[04:45.75]永遠に
"#;

// Generate a large LRC content for stress testing
fn generate_large_lrc() -> String {
    let mut content = String::new();
    content.push_str("[ar:大型测试艺术家]\n");
    content.push_str("[ti:大型测试歌曲]\n");
    content.push_str("[al:大型测试专辑]\n");
    content.push_str("[by:测试制作者]\n");
    content.push_str("[offset:0]\n\n");

    for i in 0..500 {
        // Reduced to 500 for faster benchmarking
        let minutes = i / 60;
        let seconds = i % 60;
        let milliseconds = (i * 123) % 1000;

        let ts_len = rand::rng().random_range(1..3);
        let millis_len = rand::rng().random_range(1..3);

        let str = match millis_len {
            1 => format!("[{minutes:02}:{seconds:02}.{milliseconds:01}]"),
            2 => format!("[{minutes:02}:{seconds:02}.{milliseconds:02}]"),
            _ => format!("[{minutes:02}:{seconds:02}.{milliseconds:03}]"),
        };
        let timestamps = match ts_len {
            2 => format!("{str}{str}"),
            3 => format!("{str}{str}{str}"),
            _ => str.to_string(),
        };

        content.push_str(&format!(
            "{timestamps}这是第{}行测试歌词，包含一些中文字符和数字\n",
            i + 1
        ));
    }

    content
}

// Invalid LRC content for error handling benchmarks
const INVALID_LRC: &str = r#"
[ar:艺术家]
[ti:歌曲标题]
invalid line without brackets
[00:12.34]第一行歌词
another invalid line
[invalid:timestamp]歌词
[25:99.999 ]时间戳错误
[00:30.45]正常歌词
malformed [bracket
[00:45.67]最后一行
"#;

// Comparison benchmarks with throughput measurement
fn bench_comparison(c: &mut Criterion) {
    let mut group = c.benchmark_group("LRC Parsing Comparison");

    // Small files
    group.throughput(Throughput::Bytes(SMALL_LRC.len() as u64));
    group.bench_with_input(
        BenchmarkId::new("Small", "lrc"),
        &SMALL_LRC,
        |b, content| {
            b.iter(|| {
                let lyrics = LrcLyrics::from_str(black_box(content)).unwrap();
                black_box(lyrics);
            })
        },
    );
    group.bench_with_input(
        BenchmarkId::new("Small", "fast_lrc"),
        &SMALL_LRC,
        |b, content| {
            b.iter(|| {
                let lyrics = FastLyrics::parse(black_box(content)).unwrap();
                black_box(lyrics);
            })
        },
    );

    // Medium files
    group.throughput(Throughput::Bytes(MEDIUM_LRC.len() as u64));
    group.bench_with_input(
        BenchmarkId::new("Medium", "lrc"),
        &MEDIUM_LRC,
        |b, content| {
            b.iter(|| {
                let lyrics = LrcLyrics::from_str(black_box(content)).unwrap();
                black_box(lyrics);
            })
        },
    );
    group.bench_with_input(
        BenchmarkId::new("Medium", "fast_lrc"),
        &MEDIUM_LRC,
        |b, content| {
            b.iter(|| {
                let lyrics = FastLyrics::parse(black_box(content)).unwrap();
                black_box(lyrics);
            })
        },
    );

    // Large files
    let large_lrc = generate_large_lrc();
    group.throughput(Throughput::Bytes(large_lrc.len() as u64));
    group.bench_with_input(
        BenchmarkId::new("Large", "lrc"),
        &large_lrc,
        |b, content| {
            b.iter(|| {
                let lyrics = LrcLyrics::from_str(black_box(content)).unwrap();
                black_box(lyrics);
            })
        },
    );
    group.bench_with_input(
        BenchmarkId::new("Large", "fast_lrc"),
        &large_lrc,
        |b, content| {
            b.iter(|| {
                let lyrics = FastLyrics::parse(black_box(content)).unwrap();
                black_box(lyrics);
            })
        },
    );

    group.finish();
}

// Metadata-heavy comparison
fn bench_metadata_heavy(c: &mut Criterion) {
    let mut group = c.benchmark_group("Metadata");

    const METADATA_HEAVY: &str = r#"
[ar:艺术家名称]
[ti:歌曲标题]
[al:专辑名称]
[by:制作者]
[offset:0]
[re:LRC Editor]
[ve:v2.12]
[length:04:30]
[tool:LRC Maker]
[encoding:UTF-8]
[creator:测试用户]
[date:2024-01-01]
[genre:Doujin Music]
[language:Japanese]
[comment:这是一个测试文件]

[00:12.34]第一行歌词
[00:25.67]第二行歌词
[01:30.12]第三行歌词
"#;

    group.throughput(Throughput::Bytes(METADATA_HEAVY.len() as u64));

    group.bench_function("lrc", |b| {
        b.iter(|| {
            let lyrics =
                LrcLyrics::from_str(black_box(METADATA_HEAVY)).unwrap();
            black_box(lyrics);
        })
    });

    group.bench_function("fast_lrc", |b| {
        b.iter(|| {
            let lyrics = FastLyrics::parse(black_box(METADATA_HEAVY)).unwrap();
            black_box(lyrics);
        })
    });

    group.finish();
}

// Error handling benchmarks for invalid LRC content
fn bench_error_handling(c: &mut Criterion) {
    let mut group = c.benchmark_group("Invalid");

    group.throughput(Throughput::Bytes(INVALID_LRC.len() as u64));

    group.bench_function("lrc", |b| {
        b.iter(|| {
            let _ = LrcLyrics::from_str(black_box(INVALID_LRC));
        })
    });

    group.bench_function("fast_lrc", |b| {
        b.iter(|| {
            let _ = FastLyrics::parse(black_box(INVALID_LRC));
        })
    });

    group.finish();
}

criterion_group!(
    benches,
    bench_comparison,
    bench_metadata_heavy,
    bench_error_handling
);
criterion_main!(benches);
