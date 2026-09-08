use std::collections::BTreeMap;

use super::PopularityEntity;

#[derive(Default)]
pub(super) struct Metrics {
    pub(super) visitors: u64,
    pub(super) collector_count: u64,
    pub(super) voter_count: u64,
}

impl Metrics {
    fn score(&self, half_saturation: HalfSaturationCounts) -> f64 {
        const VISITOR_WEIGHT: f64 = 0.40;
        const COLLECTOR_WEIGHT: f64 = 0.45;
        const VOTER_WEIGHT: f64 = 0.15;

        const _: () = assert!(
            VISITOR_WEIGHT + COLLECTOR_WEIGHT + VOTER_WEIGHT <= 1.0,
            "Popularity weights must sum to at most 1."
        );

        [
            VISITOR_WEIGHT
                * saturate_count(self.visitors, half_saturation.visitor),
            COLLECTOR_WEIGHT
                * saturate_count(
                    self.collector_count,
                    half_saturation.collector,
                ),
            VOTER_WEIGHT
                * saturate_count(self.voter_count, half_saturation.voter),
        ]
        .into_iter()
        .sum()
    }
}

#[derive(Clone, Copy)]
struct HalfSaturationCounts {
    visitor: u64,
    collector: u64,
    voter: u64,
}

impl HalfSaturationCounts {
    fn from_metrics<'a>(
        metrics: impl ExactSizeIterator<Item = &'a Metrics>,
    ) -> Self {
        const MIN_SAMPLE_SIZE: usize = 20;
        const FALLBACK_VISITOR_HALF_SATURATION: u64 = 100;
        const FALLBACK_COLLECTOR_HALF_SATURATION: u64 = 10;
        const FALLBACK_VOTER_HALF_SATURATION: u64 = 10;

        const _: () = {
            assert!(FALLBACK_VISITOR_HALF_SATURATION > 0);
            assert!(FALLBACK_COLLECTOR_HALF_SATURATION > 0);
            assert!(FALLBACK_VOTER_HALF_SATURATION > 0);
        };

        if metrics.len() < MIN_SAMPLE_SIZE {
            return Self {
                visitor: FALLBACK_VISITOR_HALF_SATURATION,
                collector: FALLBACK_COLLECTOR_HALF_SATURATION,
                voter: FALLBACK_VOTER_HALF_SATURATION,
            };
        }

        let mut visitors = Vec::with_capacity(metrics.len());
        let mut collectors = Vec::with_capacity(metrics.len());
        let mut voters = Vec::with_capacity(metrics.len());

        for metrics in metrics {
            visitors.push(metrics.visitors);
            collectors.push(metrics.collector_count);
            voters.push(metrics.voter_count);
        }

        Self {
            visitor: p95_or_fallback(
                visitors,
                FALLBACK_VISITOR_HALF_SATURATION,
            ),
            collector: p95_or_fallback(
                collectors,
                FALLBACK_COLLECTOR_HALF_SATURATION,
            ),
            voter: p95_or_fallback(voters, FALLBACK_VOTER_HALF_SATURATION),
        }
    }
}

pub(super) fn score_batch(
    metrics: BTreeMap<PopularityEntity, Metrics>,
) -> Vec<(PopularityEntity, f64)> {
    let half_saturation = HalfSaturationCounts::from_metrics(metrics.values());

    metrics
        .into_iter()
        .map(|(entity, metrics)| (entity, metrics.score(half_saturation)))
        .collect()
}

fn p95_or_fallback(mut counts: Vec<u64>, fallback: u64) -> u64 {
    // ceil(95 * n / 100) = n - floor(n / 20)
    let rank = counts.len() - counts.len() / 20;
    let (_, count, _) = counts.select_nth_unstable(rank - 1);

    match *count {
        0 => fallback,
        count => count,
    }
}

#[expect(
    clippy::cast_precision_loss,
    reason = "Popularity scores are approximate; integer precision above 2^53 is acceptable."
)]
fn saturate_count(count: u64, half_saturation: u64) -> f64 {
    let count = count as f64;
    let half_saturation = half_saturation as f64;
    count / (count + half_saturation)
}
