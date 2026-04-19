import { t } from "@lingui/core/macro"
import { useQuery } from "@tanstack/solid-query"
import { HomeQueryOption } from "@thc/query"
import { ErrorBoundary, For, Suspense } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { HOME_METRICS } from "~/view/Homepage/mock"
import { formatCount } from "~/view/Homepage/utils"

type MetricCardProps = {
	metric: { label: string; value: string; hint: string }
}

function MetricCard(props: MetricCardProps) {
	return (
		<Card class="border border-slate-300 bg-white/70 p-4 shadow-xs backdrop-blur-sm">
			<div class="flex items-baseline justify-between gap-4">
				<div class="text-sm font-medium text-primary">{props.metric.label}</div>
				<div class="font-mono text-lg text-primary">{props.metric.value}</div>
			</div>
			<div class="mt-1 text-xs text-tertiary">{props.metric.hint}</div>
		</Card>
	)
}

function getFallbackMetrics() {
	return HOME_METRICS.map((metric) => ({
		label: metric.label,
		hint: metric.hint,
		value: "—",
	}))
}

function HomeHeroMetricsFallback() {
	return (
		<For each={getFallbackMetrics()}>
			{(metric) => <MetricCard metric={metric} />}
		</For>
	)
}

function HomeHeroMetricsContent() {
	const metadataQuery = useQuery(() => HomeQueryOption.metadata())
	const metrics = () =>
		HOME_METRICS.map((metric) => ({
			label: metric.label,
			hint: metric.hint,
			value: formatCount(metadataQuery.data?.[metric.key]),
		}))

	return (
		<For each={metrics()}>{(metric) => <MetricCard metric={metric} />}</For>
	)
}

function HomeHeroMetrics() {
	return (
		<Suspense fallback={<HomeHeroMetricsFallback />}>
			<ErrorBoundary fallback={() => <HomeHeroMetricsFallback />}>
				<HomeHeroMetricsContent />
			</ErrorBoundary>
		</Suspense>
	)
}

export function HomeHero() {
	return (
		<section class="relative overflow-hidden rounded-md border border-slate-300 bg-linear-to-br from-reimu-100 via-primary to-marisa-100 shadow-xs">
			<div class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.65)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.65)_1px,transparent_1px)] bg-size-[22px_22px] opacity-55"></div>
			<div class="relative grid gap-8 p-8 lg:grid-cols-[1.1fr_0.9fr]">
				<div class="flex flex-col gap-6">
					<div class="flex items-center gap-3">
						<img
							src="/logo.svg"
							alt=""
							class="h-10 w-10"
						/>
						<div class="flex flex-col leading-none">
							<div class="text-xs font-medium tracking-[0.22em] text-secondary">
								TOUHOU CLOUD DB
							</div>
							<div class="text-xs text-tertiary">
								{t`Open doujin music database`}
							</div>
						</div>
					</div>

					<div class="flex flex-col gap-3">
						<h1 class="text-5xl font-light tracking-tighter text-primary ">
							{t`Explore doujin music`}
						</h1>
						<h2 class="text-secondary text-xl">
							{t`Contribute what’s missing and help keep the database accurate for everyone.`}
						</h2>
					</div>
				</div>

				<div class="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
					<HomeHeroMetrics />
					<Card class="flex flex-col gap-2 border border-slate-300 bg-white/70 p-4 shadow-xs backdrop-blur-sm">
						<div class="text-xs font-medium tracking-[0.18em] text-tertiary">
							{t`STATUS`}
						</div>
						<div class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-secondary ring-1 ring-slate-200 ring-inset">
							<span class="inline-block size-1.5 rounded-full bg-reimu-600"></span>
							{t`Preview`}
						</div>
					</Card>
				</div>
			</div>
		</section>
	)
}

export function HomeHeroSkeleton() {
	return (
		<section class="relative overflow-hidden rounded-md border border-slate-300 bg-linear-to-br from-reimu-100 via-primary to-marisa-100 shadow-xs">
			<div class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.65)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.65)_1px,transparent_1px)] bg-size-[22px_22px] opacity-55"></div>
			<div class="relative grid gap-8 p-8 lg:grid-cols-[1.1fr_0.9fr]">
				<div class="flex flex-col gap-6">
					<div class="flex items-center gap-3">
						<img
							src="/logo.svg"
							alt=""
							class="h-10 w-10"
						/>
						<div class="flex flex-col leading-none">
							<div class="text-xs font-medium tracking-[0.22em] text-secondary">
								TOUHOU CLOUD DB
							</div>
							<div class="text-xs text-tertiary">
								{t`Open doujin music database`}
							</div>
						</div>
					</div>

					<div class="flex flex-col gap-3">
						<h1 class="text-5xl font-light tracking-tighter text-primary ">
							{t`Explore doujin music`}
						</h1>
						<h2 class="text-secondary text-xl">
							{t`Contribute what’s missing and help keep the database accurate for everyone.`}
						</h2>
					</div>
				</div>

				<div class="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
					<For each={getFallbackMetrics()}>
						{(metric) => <MetricCard metric={metric} />}
					</For>
					<Card class="flex flex-col gap-2 border border-slate-300 bg-white/70 p-4 shadow-xs backdrop-blur-sm">
						<div class="text-xs font-medium tracking-[0.18em] text-tertiary">
							{t`STATUS`}
						</div>
						<div class="flex items-center justify-between gap-4">
							<div class="text-sm text-secondary">{t`API-powered UI`}</div>
							<div class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-secondary ring-1 ring-slate-200 ring-inset">
								<span class="inline-block size-1.5 rounded-full bg-reimu-600"></span>
								{t`Alpha`}
							</div>
						</div>
					</Card>
				</div>
			</div>
		</section>
	)
}
