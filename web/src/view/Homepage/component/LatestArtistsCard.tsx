import { useLingui } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import { ArtistApi } from "@thc/api"
import { Either } from "effect"
import { For, Show, Suspense } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { ArtistCard } from "~/view/Homepage/component/ArtistCard"
import { ExploreSection } from "~/view/Homepage/component/ExploreSection"
import { HomeEmptySlot } from "~/view/Homepage/component/HomeEmptySlot"

const MAX_VISIBLE_ARTISTS = 6
const LATEST_ARTISTS_GRID_CLASS = "grid grid-cols-3 gap-0.5"

function ArtistTileSkeleton() {
	return (
		<Card class="flex flex-col rounded-none p-3 shadow-none animate-pulse motion-reduce:animate-none">
			<div class="aspect-square w-full rounded-full bg-slate-100"></div>

			<div class="flex flex-1 flex-col justify-between gap-1 pt-2">
				<div class="h-3.5 w-4/5 rounded bg-slate-200"></div>
				<div class="h-3 w-2/5 rounded bg-slate-100"></div>
			</div>
		</Card>
	)
}

function LatestArtistsGridSkeleton() {
	return (
		<div class={LATEST_ARTISTS_GRID_CLASS}>
			<For each={Array.from({ length: MAX_VISIBLE_ARTISTS })}>
				{() => <ArtistTileSkeleton />}
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

	const visibleArtists = () =>
		(latestArtistsQuery.data ?? []).slice(0, MAX_VISIBLE_ARTISTS)

	return (
		<Show
			when={visibleArtists().length > 0}
			fallback={<HomeEmptySlot class="h-36" />}
		>
			<div class={LATEST_ARTISTS_GRID_CLASS}>
				<For each={visibleArtists()}>
					{(artist) => <ArtistCard artist={artist} />}
				</For>
			</div>
		</Show>
	)
}

export function LatestArtistsCard() {
	const { t } = useLingui()
	return (
		<ExploreSection
			title={t`Latest Artists`}
			to="/artist/explore"
		>
			<Suspense fallback={<LatestArtistsGridSkeleton />}>
				<LatestArtistsGrid />
			</Suspense>
		</ExploreSection>
	)
}
