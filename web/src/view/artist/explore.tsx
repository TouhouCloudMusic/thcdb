import { useInfiniteQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import type { ArtistType } from "@thc/api"

import { ARTIST_TYPES } from "~/domain/artist/constants"
import { PageLayout } from "~/layout"
import { createMockPaginatedArtists } from "~/mock/artist"
import { useIntersectionSentinel } from "~/utils/solid/useIntersectionSentinel"
import { useScrollDirection } from "~/utils/solid/useScrollDirection"
import {
	ArtistExploreFilterBar,
	ArtistExploreList,
} from "~/view/artist/explore.comp"

const route = getRouteApi("/artist/explore")

type ArtistExploreSearch = {
	artist_type?: ArtistType[]
	sort_by?: "created_at" | "handled_at"
	order_by?: "asc" | "desc"
	limit: number
}

const isArtistType = (value: string): value is ArtistType => {
	return ARTIST_TYPES.some((t) => t === value)
}

const parseArtistTypeFilterValue = (value: string) => {
	if (isArtistType(value)) return [value]
}

const createArtistExploreInfiniteQueryOptions = (
	search: () => ArtistExploreSearch,
) => ({
	queryKey: [
		"artist::explore",
		search().artist_type,
		search().sort_by,
		search().order_by,
		search().limit,
	],
	queryFn: ({ pageParam }: { pageParam: number }) => {
		const snapshot = search()
		return createMockPaginatedArtists({
			limit: snapshot.limit,
			cursor: pageParam,
			artist_type: snapshot.artist_type,
			sort_field: snapshot.sort_by,
			sort_direction: snapshot.order_by,
		})
	},
	initialPageParam: 0,
	getNextPageParam: (lastPage: { next_cursor: number | null }) =>
		lastPage.next_cursor,
})

export const ArtistExplore = () => {
	const search = route.useSearch()
	const scrollDirection = useScrollDirection()
	const navigate = useNavigate({ from: "/artist/explore" })

	const applySearchPatch = (patch: Partial<ArtistExploreSearch>) => {
		navigate({
			to: "/artist/explore",
			search: { ...search(), ...patch },
		})
	}

	const artistTypeValue = () => search().artist_type?.[0] ?? ""

	const artistsQuery = useInfiniteQuery(() =>
		createArtistExploreInfiniteQueryOptions(search),
	)

	const artists = () => artistsQuery.data?.pages.flatMap((p) => p.items) ?? []

	const setSentinelRef = useIntersectionSentinel<HTMLDivElement>({
		enabled: () => artistsQuery.hasNextPage && !artistsQuery.isFetchingNextPage,
		onIntersect: () => {
			void artistsQuery.fetchNextPage()
		},
	})

	return (
		<PageLayout class="p-8">
			<div class="flex flex-col gap-6">
				<h1 class="text-2xl font-light tracking-tighter text-slate-900">
					Explore Artists
				</h1>

				<ArtistExploreFilterBar
					scrollDirection={scrollDirection}
					artistTypeValue={artistTypeValue()}
					onArtistTypeChange={(value) => {
						applySearchPatch({
							artist_type: parseArtistTypeFilterValue(value),
						})
					}}
					sortBy={search().sort_by}
					onSortByChange={(value) => applySearchPatch({ sort_by: value })}
					orderBy={search().order_by}
					onOrderByChange={(value) => applySearchPatch({ order_by: value })}
				/>

				<ArtistExploreList
					artists={artists()}
					isLoading={artistsQuery.isLoading}
					isFetchingNextPage={artistsQuery.isFetchingNextPage}
					hasNextPage={artistsQuery.hasNextPage}
					limit={search().limit}
					setSentinelRef={setSentinelRef}
				/>
			</div>
		</PageLayout>
	)
}
