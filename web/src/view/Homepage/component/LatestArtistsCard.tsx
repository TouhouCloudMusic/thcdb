import { t } from "@lingui/core/macro"
import { useQuery } from "@tanstack/solid-query"
import { ArtistApi } from "@thc/api"
import { Either } from "effect"
import { For, Show, Suspense } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { ArtistCard } from "~/view/Homepage/component/ArtistCard"
import { ExploreSection } from "~/view/Homepage/component/ExploreSection"
import { HomeEmptySlot } from "~/view/Homepage/component/HomeEmptySlot"

const MAX_VISIBLE_ARTISTS = 6

function ArtistTileSkeleton(props: { isLoading?: boolean }) {
	const pulse = () =>
		props.isLoading ? "animate-pulse motion-reduce:animate-none" : ""

	return (
		<Card
			class={`flex h-full flex-col gap-3 rounded-none border border-slate-300 bg-white p-3 shadow-none ${pulse()}`}
		>
			<div class="w-full overflow-hidden rounded-full border border-slate-200 bg-slate-100">
				<div class="aspect-square w-full rounded-full bg-slate-100"></div>
			</div>

			<div class="flex w-full flex-col gap-1">
				<div class="h-3.5 w-4/5 rounded bg-slate-200"></div>
				<div class="flex items-center gap-1.5">
					<div class="h-1 w-1 rounded-full bg-slate-200"></div>
					<div class="h-2.5 w-2/5 rounded bg-slate-100"></div>
				</div>
			</div>
		</Card>
	)
}

function LatestArtistsGridEmpty() {
	return <HomeEmptySlot class="h-36" />
}

function LatestArtistsGridSkeleton() {
	return (
		<div class="grid grid-cols-3 gap-3">
			<For each={Array.from({ length: MAX_VISIBLE_ARTISTS })}>
				{() => <ArtistTileSkeleton isLoading />}
			</For>
		</div>
	)
}

function LatestArtistsGrid() {
	const latestArtistsQuery = useQuery(() => ({
		queryKey: ["home::latest-artists", MAX_VISIBLE_ARTISTS],
		queryFn: async () => {
			const res = await ArtistApi.explore({
				query: {
					page: 1,
					limit: MAX_VISIBLE_ARTISTS,
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

	const artists = () => latestArtistsQuery.data ?? []
	const visibleArtists = () => artists().slice(0, MAX_VISIBLE_ARTISTS)
	const hasArtists = () => visibleArtists().length > 0

	return (
		<Show
			when={hasArtists()}
			fallback={<LatestArtistsGridEmpty />}
		>
			<div class="grid grid-cols-3 gap-3">
				<For each={visibleArtists()}>
					{(artist) => <ArtistCard artist={artist} />}
				</For>
			</div>
		</Show>
	)
}

export function LatestArtistsCard() {
	return (
		<Card class="relative overflow-hidden bg-transparent p-0 shadow-none">
			<ExploreSection
				title={t`Latest Artists`}
				to="/artist/explore"
			>
				<Suspense fallback={<LatestArtistsGridSkeleton />}>
					<LatestArtistsGrid />
				</Suspense>
			</ExploreSection>
		</Card>
	)
}
