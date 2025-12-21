import { useInfiniteQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"

import { PageLayout } from "~/layout"
import { createMockPaginatedLabels } from "~/mock/label"
import { useIntersectionSentinel } from "~/utils/solid/useIntersectionSentinel"
import { useScrollDirection } from "~/utils/solid/useScrollDirection"
import {
	LabelExploreFilterBar,
	LabelExploreList,
} from "~/view/label/explore.comp"

const route = getRouteApi("/label/explore")

type LabelExploreSearch = {
	is_dissolved?: boolean
	founded_date_from?: string
	founded_date_to?: string
	sort_by?: "created_at" | "handled_at"
	order_by?: "asc" | "desc"
	limit: number
}

const getDissolvedSelectValue = (value: boolean | undefined) => {
	if (undefined === value) return ""
	return value ? "true" : "false"
}

const parseDissolvedSelectValue = (value: string): boolean | undefined => {
	if ("" === value) return undefined
	return "true" === value
}

const createLabelExploreInfiniteQueryOptions = (
	search: () => LabelExploreSearch,
) => ({
	queryKey: [
		"label::explore",
		search().is_dissolved,
		search().founded_date_from,
		search().founded_date_to,
		search().sort_by,
		search().order_by,
		search().limit,
	],
	queryFn: ({ pageParam }: { pageParam: number }) => {
		const snapshot = search()
		return createMockPaginatedLabels({
			limit: snapshot.limit,
			cursor: pageParam,
			is_dissolved: snapshot.is_dissolved,
			founded_date_from: snapshot.founded_date_from,
			founded_date_to: snapshot.founded_date_to,
			sort_field: snapshot.sort_by,
			sort_direction: snapshot.order_by,
		})
	},
	initialPageParam: 0,
	getNextPageParam: (lastPage: { next_cursor: number | null }) =>
		lastPage.next_cursor,
})

export const LabelExplore = () => {
	const search = route.useSearch()
	const scrollDirection = useScrollDirection()

	const navigate = useNavigate({ from: "/label/explore" })

	const applySearchPatch = (patch: Partial<LabelExploreSearch>) => {
		navigate({
			to: "/label/explore",
			search: { ...search(), ...patch },
		})
	}

	const labelsQuery = useInfiniteQuery(() =>
		createLabelExploreInfiniteQueryOptions(search),
	)

	const labels = () => labelsQuery.data?.pages.flatMap((p) => p.items) ?? []

	const setSentinelRef = useIntersectionSentinel<HTMLDivElement>({
		enabled: () => labelsQuery.hasNextPage && !labelsQuery.isFetchingNextPage,
		onIntersect: () => {
			void labelsQuery.fetchNextPage()
		},
	})

	return (
		<PageLayout class="p-8">
			<div class="flex flex-col gap-6">
				<h1 class="text-2xl font-light tracking-tighter text-slate-900">
					Explore Labels
				</h1>

				<LabelExploreFilterBar
					scrollDirection={scrollDirection}
					dissolvedValue={getDissolvedSelectValue(search().is_dissolved)}
					onDissolvedChange={(value) =>
						applySearchPatch({
							is_dissolved: parseDissolvedSelectValue(value),
						})
					}
					foundedDateFrom={search().founded_date_from ?? ""}
					foundedDateTo={search().founded_date_to ?? ""}
					onFoundedDateChange={(key, value) =>
						applySearchPatch({ [key]: value || undefined })
					}
					sortBy={search().sort_by}
					onSortByChange={(value) => applySearchPatch({ sort_by: value })}
					orderBy={search().order_by}
					onOrderByChange={(value) => applySearchPatch({ order_by: value })}
				/>

				<LabelExploreList
					labels={labels()}
					isLoading={labelsQuery.isLoading}
					isFetchingNextPage={labelsQuery.isFetchingNextPage}
					hasNextPage={labelsQuery.hasNextPage}
					limit={search().limit}
					setSentinelRef={setSentinelRef}
				/>
			</div>
		</PageLayout>
	)
}
