import { useQuery } from "@tanstack/solid-query"
import { HomeQueryOption } from "@thc/query"
import { ErrorBoundary, For } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { HOME_METRICS } from "~/view/Homepage/mock"
import { formatCount } from "~/view/Homepage/utils"

type MetricCardProps = {
	metric: { label: string; value: string; hint: string }
}

const MetricCard = (props: MetricCardProps) => (
	<Card class="border border-slate-300 bg-white/70 p-4 shadow-xs backdrop-blur-sm">
		<div class="flex items-baseline justify-between gap-4">
			<div class="text-sm font-medium text-primary">{props.metric.label}</div>
			<div class="font-mono text-lg text-primary">{props.metric.value}</div>
		</div>
		<div class="mt-1 text-xs text-tertiary">{props.metric.hint}</div>
	</Card>
)

const HomeHero = () => {
	const metadataQuery = useQuery(() => HomeQueryOption.metadata())
	const metrics = () =>
		HOME_METRICS.map((metric) => ({
			label: metric.label,
			hint: metric.hint,
			value: formatCount(metadataQuery.data?.[metric.key]),
		}))
	const fallbackMetrics = () =>
		HOME_METRICS.map((metric) => ({
			label: metric.label,
			hint: metric.hint,
			value: "—",
		}))

	return (
		<section class="relative overflow-hidden rounded-md border border-slate-300 bg-gradient-to-br from-reimu-100 via-primary to-marisa-100 shadow-xs">
			<div class="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.65)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.65)_1px,transparent_1px)] [background-size:22px_22px] opacity-55"></div>
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
								Open doujin music database
							</div>
						</div>
					</div>

					<div class="flex flex-col gap-3">
						<h1 class="text-5xl font-light tracking-tighter text-primary ">
							Explore doujin music
						</h1>
						<h2 class="text-secondary text-xl">
							Contribute what’s missing and help keep the database accurate for
							everyone.
						</h2>
					</div>
				</div>

				<div class="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
					<ErrorBoundary
						fallback={() => (
							<For each={fallbackMetrics()}>
								{(metric) => <MetricCard metric={metric} />}
							</For>
						)}
					>
						<For each={metrics()}>
							{(metric) => <MetricCard metric={metric} />}
						</For>
					</ErrorBoundary>
					<Card class="border border-slate-300 bg-white/70 p-4 shadow-xs backdrop-blur-sm">
						<div class="flex flex-col gap-2">
							<div class="text-xs font-medium tracking-[0.18em] text-tertiary">
								STATUS
							</div>
							<div class="flex items-center justify-between gap-4">
								<div class="text-sm text-secondary">Mock-powered UI</div>
								<div class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-secondary ring-1 ring-slate-200 ring-inset">
									<span class="inline-block size-1.5 rounded-full bg-reimu-600"></span>
									Preview
								</div>
							</div>
							<div class="text-xs text-tertiary">
								Components follow project tokens: slate base, reimu/marisa
								accents, subtle borders and shadows.
							</div>
						</div>
					</Card>
				</div>
			</div>
		</section>
	)
}

export { HomeHero }
