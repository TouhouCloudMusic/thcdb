import { useLingui } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import { ReleaseApi } from "@thc/api"
import { Either } from "effect"
import { For, Show, Suspense } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { PageLayout } from "~/layout/PageLayout"
import { ExploreSection } from "~/view/Homepage/component/ExploreSection"
import { HomeEmptySlot } from "~/view/Homepage/component/HomeEmptySlot"
import { HomeStats } from "~/view/Homepage/component/HomeStats"
import { LatestArtistsCard } from "~/view/Homepage/component/LatestArtistsCard"
import { ReleaseCard } from "~/view/Homepage/component/ReleaseCard"
import { TrendingTagsCard } from "~/view/Homepage/component/TrendingTagsCard"
import { UpcomingEventsCard } from "~/view/Homepage/component/UpcomingEventsCard"

const RELEASES_LIMIT = 6

function ReleaseCardSkeleton() {
	return (
		<Card class="flex aspect-[1/1.309] flex-col overflow-hidden rounded-none p-0 shadow-none animate-pulse motion-reduce:animate-none">
			<div class="aspect-square w-full shrink-0 bg-slate-100"></div>
			<div class="grid min-h-0 flex-1 grid-rows-2 p-1">
				<div class="flex items-center justify-between gap-2">
					<div class="h-5 w-3/4 rounded bg-slate-200"></div>
					<div class="h-3 w-10 rounded bg-slate-100"></div>
				</div>

				<div class="flex items-center justify-between gap-3 self-end">
					<div class="h-3 w-1/2 rounded bg-slate-100"></div>
					<div class="h-3 w-12 rounded bg-slate-100"></div>
				</div>
			</div>
		</Card>
	)
}

const LATEST_RELEASES_GRID_CLASS = "grid gap-0.5 sm:grid-cols-2 xl:grid-cols-3"

function LatestReleasesGridSkeleton() {
	return (
		<div class={LATEST_RELEASES_GRID_CLASS}>
			<For each={Array.from({ length: RELEASES_LIMIT })}>
				{() => <ReleaseCardSkeleton />}
			</For>
		</div>
	)
}

function LatestReleasesGrid() {
	const releasesQuery = useQuery(() => ({
		queryKey: ["home::latest-releases", RELEASES_LIMIT],
		queryFn: async () => {
			const res = await ReleaseApi.explore({
				query: {
					page: 1,
					limit: RELEASES_LIMIT,
					sort_field: "created_at",
					sort_direction: "desc",
				},
			})
			const paginated = Either.getOrThrowWith(res, (error) => {
				throw error
			})
			return paginated.items
		},
	}))

	const visibleReleases = () =>
		(releasesQuery.data ?? []).slice(0, RELEASES_LIMIT)

	return (
		<Show
			when={visibleReleases().length > 0}
			fallback={<HomeEmptySlot class="h-56" />}
		>
			<div class={LATEST_RELEASES_GRID_CLASS}>
				<For each={visibleReleases()}>
					{(release) => <ReleaseCard release={release} />}
				</For>
			</div>
		</Show>
	)
}

export function HomePage() {
	const { t } = useLingui()
	return (
		<PageLayout class="max-w-360 2xl:max-w-360">
			<HomeStats />

			<section class="grid gap-x-8 gap-y-6 px-8 pt-4 pb-8 lg:grid-cols-[1.35fr_0.65fr]">
				<ExploreSection
					title={t`Latest Releases`}
					to="/release/explore"
				>
					<Suspense fallback={<LatestReleasesGridSkeleton />}>
						<LatestReleasesGrid />
					</Suspense>
					<LatestArtistsCard />
				</ExploreSection>

				<div class="flex flex-col gap-8">
					<UpcomingEventsCard />
					<TrendingTagsCard />
				</div>
			</section>
		</PageLayout>
	)
}
