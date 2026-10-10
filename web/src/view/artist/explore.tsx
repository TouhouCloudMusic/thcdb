import { useLingui } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { Nil } from "@thc/toolkit/data"

import { ExplorePageLayout } from "~/component/feature/entity_explore"
import type { ArtistType, SortDirection } from "~/hey-api"
import { exploreArtistOptions } from "~/hey-api/@tanstack/solid-query.gen"
import {
	ArtistExploreFilterBar,
	ArtistExploreList,
} from "~/view/artist/explore.comp"

const route = getRouteApi("/artist/explore")

type ArtistExploreSearch = {
	artist_type?: ArtistType[]
	sort_by?: "created_at" | "updated_at"
	order_by?: SortDirection
	limit: number
	page: number
}

export const ArtistExplore = () => {
	const { t } = useLingui()
	const search = route.useSearch()
	const navigate = useNavigate({ from: "/artist/explore" })

	const applyFilterPatch = (patch: Partial<ArtistExploreSearch>) => {
		void navigate({
			to: "/artist/explore",
			search: { ...search(), ...patch, page: 1 },
		})
	}

	const artistTypeValue = () => search().artist_type?.[0]

	const artistsQuery = useQuery(() => {
		const snapshot = search()
		return exploreArtistOptions({
			query: {
				limit: snapshot.limit,
				page: snapshot.page,
				artist_type: snapshot.artist_type,
				sort_field: snapshot.sort_by,
				sort_direction: snapshot.order_by,
			},
		})
	})

	const artists = () => artistsQuery.data?.data.items ?? []
	const totalPages = () => artistsQuery.data?.data.total_pages ?? 0

	const setPage = (page: number) => {
		void navigate({
			to: "/artist/explore",
			search: { ...search(), page },
		})
	}

	const changeArtistType = (value: ArtistType | undefined) => {
		applyFilterPatch({ artist_type: Nil.map((selected) => [selected], value) })
	}

	return (
		<ExplorePageLayout
			title={t`Explore Artists`}
			action={{ to: "/artist/new", label: t`Create artist` }}
		>
			<ArtistExploreFilterBar
				artistTypeValue={artistTypeValue()}
				onArtistTypeChange={changeArtistType}
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
