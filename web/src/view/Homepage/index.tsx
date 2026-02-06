import { useQuery } from "@tanstack/solid-query"
import { ReleaseApi } from "@thc/api"
import { Either } from "effect"
import { For, Show, Suspense } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { PageLayout } from "~/layout/PageLayout"
import { ExploreSection } from "~/view/Homepage/component/ExploreSection"
import { HomeEmptySlot } from "~/view/Homepage/component/HomeEmptySlot"
import { HomeHero } from "~/view/Homepage/component/HomeHero"
import { LatestArtistsCard } from "~/view/Homepage/component/LatestArtistsCard"
import { ReleaseCard } from "~/view/Homepage/component/ReleaseCard"
import { TrendingTagsCard } from "~/view/Homepage/component/TrendingTagsCard"
import { UpcomingEventsCard } from "~/view/Homepage/component/UpcomingEventsCard"

const RELEASES_LIMIT = 6

type ReleaseCardSkeletonProps = {
	isLoading?: boolean
}

function ReleaseCardSkeleton(props: ReleaseCardSkeletonProps) {
	const pulse = () =>
		props.isLoading ? "animate-pulse motion-reduce:animate-none" : ""

	return (
		<Card
			class={`flex h-full flex-col overflow-hidden rounded-none border border-slate-300 p-0 shadow-xs ${pulse()}`}
		>
			<div class="aspect-4/3 w-full bg-slate-100 ring-1 ring-slate-200 ring-inset"></div>
			<div class="flex flex-1 flex-col gap-2 p-4">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0 flex-1">
						<div class="h-4 w-3/4 rounded bg-slate-200"></div>
						<div class="mt-2 h-3 w-1/2 rounded bg-slate-100"></div>
					</div>
					<div class="h-3 w-10 rounded bg-slate-100"></div>
				</div>

				<div class="mt-auto h-5 w-16 rounded-full bg-slate-100 ring-1 ring-slate-200 ring-inset"></div>
			</div>
		</Card>
	)
}

function LatestReleasesEmpty() {
	return <HomeEmptySlot class="h-56" />
}

function LatestReleasesGridSkeleton() {
	return (
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			<For each={Array.from({ length: RELEASES_LIMIT })}>
				{() => <ReleaseCardSkeleton isLoading />}
			</For>
		</div>
	)
}

function LatestReleasesGrid() {
	function Content() {
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

		const releases = () => releasesQuery.data ?? []
		const visibleReleases = () => releases().slice(0, RELEASES_LIMIT)
		const hasReleases = () => visibleReleases().length > 0

		return (
			<Show
				when={hasReleases()}
				fallback={<LatestReleasesEmpty />}
			>
				<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					<For each={visibleReleases()}>
						{(release) => <ReleaseCard release={release} />}
					</For>
				</div>
			</Show>
		)
	}

	return (
		<Suspense fallback={<LatestReleasesGridSkeleton />}>
			<Content />
		</Suspense>
	)
}

export function HomePage() {
	return (
		<PageLayout class="p-8">
			<div class="flex flex-col gap-10">
				<HomeHero />

				<section class="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
					<ExploreSection
						title="Latest Releases"
						to="/release/explore"
					>
						<LatestReleasesGrid />
						<LatestArtistsCard />
					</ExploreSection>

					<div class="flex flex-col gap-4">
						<div class="-mt-5">
							<TrendingTagsCard />
						</div>
						<UpcomingEventsCard />
					</div>
				</section>
			</div>
		</PageLayout>
	)
}
