import { useInfiniteQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { LabelApi } from "@thc/api"
import { Either } from "effect"

import { Link } from "~/component/atomic"
import { PageLayout } from "~/layout"
import { useIntersectionSentinel } from "~/utils/solid/useIntersectionSentinel"
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
}

const createLabelExploreInfiniteQueryOptions = (
	search: () => LabelExploreSearch,
) => ({
	queryKey: [
		"label::explore",
		search().sort_by,
		search().order_by,
		search().limit,
	],
	queryFn: async ({ pageParam }: { pageParam: number }) => {
		const snapshot = search()
		return Either.getOrThrowWith(
			await LabelApi.explore({
				query: {
					limit: snapshot.limit,
					cursor: pageParam,
					sort_field: snapshot.sort_by,
					sort_direction: snapshot.order_by,
				},
			}),
			(error) => {
				throw error
			},
		)
	},
	initialPageParam: 0,
	getNextPageParam: (lastPage: { next_cursor?: number | null }) =>
		lastPage.next_cursor ?? null,
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
				<div class="flex items-center justify-between gap-4">
					<h1 class="text-2xl font-light tracking-tighter text-slate-900">
						Explore Labels
					</h1>
					<Link
						to="/label/new"
						class="text-sm font-light text-primary"
					>
						Create label
					</Link>
				</div>

				<LabelExploreFilterBar
					scrollDirection={scrollDirection}
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
