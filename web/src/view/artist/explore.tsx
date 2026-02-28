import { useQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { ArtistApi } from "@thc/api"
import type { ArtistType } from "@thc/api"
import { Either } from "effect"

import { ExplorePageLayout } from "~/component/feature/entity_explore"
import { ARTIST_TYPES } from "~/domain/artist/constants"
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
	page: number
}

const isArtistType = (value: string): value is ArtistType => {
	return ARTIST_TYPES.some((t) => t === value)
}

const parseArtistTypeFilterValue = (value: string) => {
	if (isArtistType(value)) return [value]
}

const createArtistExploreQueryOptions = (
	search: () => ArtistExploreSearch,
) => ({
	queryKey: [
		"artist::explore",
		search().page,
		search().artist_type,
		search().sort_by,
		search().order_by,
		search().limit,
	],
	queryFn: async () => {
		const snapshot = search()
		return Either.getOrThrowWith(
			await ArtistApi.explore({
				query: {
					limit: snapshot.limit,
					page: snapshot.page,
					artist_type: snapshot.artist_type,
					sort_field: snapshot.sort_by,
					sort_direction: snapshot.order_by,
				},
			}),
			(error) => {
				throw error
			},
		)
	},
})

export const ArtistExplore = () => {
	const search = route.useSearch()
	const scrollDirection = useScrollDirection()
	const navigate = useNavigate({ from: "/artist/explore" })

	const applyFilterPatch = (patch: Partial<ArtistExploreSearch>) => {
		void navigate({
			to: "/artist/explore",
			search: { ...search(), ...patch, page: 1 },
		})
	}

	const artistTypeValue = () => search().artist_type?.[0] ?? ""

	const artistsQuery = useQuery(() => createArtistExploreQueryOptions(search))

	const artists = () => artistsQuery.data?.items ?? []
	const totalPages = () => artistsQuery.data?.total_pages ?? 0

	const setPage = (page: number) => {
		void navigate({
			to: "/artist/explore",
			search: { ...search(), page },
		})
	}

	return (
		<ExplorePageLayout
			title="Explore Artists"
			action={{ to: "/artist/new", label: "Create artist" }}
		>
			<ArtistExploreFilterBar
				scrollDirection={scrollDirection}
				artistTypeValue={artistTypeValue()}
				onArtistTypeChange={(value) => {
					applyFilterPatch({
						artist_type: parseArtistTypeFilterValue(value),
					})
				}}
				sortBy={search().sort_by}
				onSortByChange={(value) => applyFilterPatch({ sort_by: value })}
				orderBy={search().order_by}
				onOrderByChange={(value) => applyFilterPatch({ order_by: value })}
			/>

			<ArtistExploreList
				artists={artists()}
				isLoading={artistsQuery.isLoading}
				isFetching={artistsQuery.isFetching}
				limit={search().limit}
				page={search().page}
				totalPages={totalPages()}
				onPageChange={setPage}
			/>
		</ExplorePageLayout>
	)
}
