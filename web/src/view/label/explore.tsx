import { useLingui } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"

import { ExplorePageLayout } from "~/component/feature/entity_explore"
import { exploreLabelOptions } from "~/hey-api/@tanstack/solid-query.gen"
import {
	LabelExploreFilterBar,
	LabelExploreList,
} from "~/view/label/explore.comp"

const route = getRouteApi("/label/explore")

type LabelExploreSearch = {
	sort_by?: "created_at" | "updated_at"
	order_by?: "asc" | "desc"
	limit: number
	page: number
}

export const LabelExplore = () => {
	const { t } = useLingui()
	const search = route.useSearch()

	const navigate = useNavigate({ from: "/label/explore" })

	const applyFilterPatch = (patch: Partial<LabelExploreSearch>) => {
		void navigate({
			to: "/label/explore",
			search: { ...search(), ...patch, page: 1 },
		})
	}

	const labelsQuery = useQuery(() => {
		const snapshot = search()
		return exploreLabelOptions({
			query: {
				limit: snapshot.limit,
				page: snapshot.page,
				sort_field: snapshot.sort_by,
				sort_direction: snapshot.order_by,
			},
		})
	})

	const labels = () => labelsQuery.data?.data.items ?? []
	const totalPages = () => labelsQuery.data?.data.total_pages ?? 0

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
