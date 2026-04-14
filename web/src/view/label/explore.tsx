import { t } from "@lingui/core/macro"
import { useQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { LabelApi } from "@thc/api"
import { Either } from "effect"

import { ExplorePageLayout } from "~/component/feature/entity_explore"
import { useScrollDirection } from "~/utils/solid/useScrollDirection"
import {
	LabelExploreFilterBar,
	LabelExploreList,
} from "~/view/label/explore.comp"

const route = getRouteApi("/label/explore")

type LabelExploreSearch = {
	sort_by?: "created_at" | "handled_at"
	order_by?: "asc" | "desc"
	limit: number
	page: number
}

const createLabelExploreQueryOptions = (search: () => LabelExploreSearch) => ({
	queryKey: [
		"label::explore",
		search().page,
		search().sort_by,
		search().order_by,
		search().limit,
	],
	queryFn: async () => {
		const snapshot = search()
		return Either.getOrThrowWith(
			await LabelApi.explore({
				query: {
					limit: snapshot.limit,
					page: snapshot.page,
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

export const LabelExplore = () => {
	const search = route.useSearch()
	const scrollDirection = useScrollDirection()

	const navigate = useNavigate({ from: "/label/explore" })

	const applyFilterPatch = (patch: Partial<LabelExploreSearch>) => {
		void navigate({
			to: "/label/explore",
			search: { ...search(), ...patch, page: 1 },
		})
	}

	const labelsQuery = useQuery(() => createLabelExploreQueryOptions(search))

	const labels = () => labelsQuery.data?.items ?? []
	const totalPages = () => labelsQuery.data?.total_pages ?? 0

	const setPage = (page: number) => {
		void navigate({
			to: "/label/explore",
			search: { ...search(), page },
		})
	}

	return (
		<ExplorePageLayout
			title={t`Explore Labels`}
			action={{ to: "/label/new", label: t`Create label` }}
		>
			<LabelExploreFilterBar
				scrollDirection={scrollDirection}
				sortBy={search().sort_by}
				onSortByChange={(value) => applyFilterPatch({ sort_by: value })}
				orderBy={search().order_by}
				onOrderByChange={(value) => applyFilterPatch({ order_by: value })}
			/>

			<LabelExploreList
				labels={labels()}
				isLoading={labelsQuery.isLoading}
				isFetching={labelsQuery.isFetching}
				limit={search().limit}
				page={search().page}
				totalPages={totalPages()}
				onPageChange={setPage}
			/>
		</ExplorePageLayout>
	)
}
