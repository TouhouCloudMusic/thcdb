import { useLingui } from "@lingui-solid/solid/macro"
import { useInfiniteQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import type { ReleaseType } from "@thc/api"

import { RELEASE_TYPES } from "~/domain/release/constants"
import { PageLayout } from "~/layout"
import { createMockPaginatedReleases } from "~/mock/release"
import { useIntersectionSentinel } from "~/utils/solid/useIntersectionSentinel"
import { useScrollDirection } from "~/utils/solid/useScrollDirection"
import {
	ReleaseExploreFilterBar,
	ReleaseExploreList,
} from "~/view/release/explore.comp"

const route = getRouteApi("/release/explore")

const isReleaseType = (value: string): value is ReleaseType => {
	return RELEASE_TYPES.some((t) => t === value)
}

export const ReleaseExplore = () => {
	const search = route.useSearch()
	const scrollDirection = useScrollDirection()

	const { i18n } = useLingui()

	const navigate = useNavigate({ from: "/release/explore" })

	const releaseType = () => search().release_type?.[0]

	const releasesQuery = useInfiniteQuery(() => ({
		queryKey: [
			"release::explore",
			search().release_type,
			search().sort_by,
			search().order_by,
			search().limit,
		],
		queryFn: ({ pageParam }) => {
			return createMockPaginatedReleases({
				limit: search().limit,
				cursor: pageParam,
				release_type: search().release_type,
				sort_field: search().sort_by,
				sort_direction: search().order_by,
			})
		},
		initialPageParam: 0,
		getNextPageParam: (lastPage) => lastPage.next_cursor,
	}))

	const releases = () => releasesQuery.data?.pages.flatMap((p) => p.items) ?? []

	const setSentinelRef = useIntersectionSentinel<HTMLDivElement>({
		enabled: () =>
			releasesQuery.hasNextPage && !releasesQuery.isFetchingNextPage,
		onIntersect: () => {
			void releasesQuery.fetchNextPage()
		},
	})

	const updateFilter = (
		key: "sort_by" | "order_by",
		value: string | undefined,
	) => {
		navigate({
			to: "/release/explore",
			search: {
				...search(),
				[key]: value || undefined,
			},
		})
	}

	const setSortBy = (value: "created_at" | "handled_at") => {
		updateFilter("sort_by", value)
	}

	const setOrderBy = (value: "asc" | "desc") => {
		updateFilter("order_by", value)
	}

	const updateReleaseType = (value: string) => {
		navigate({
			to: "/release/explore",
			search: {
				...search(),
				release_type: isReleaseType(value) ? [value] : undefined,
			},
		})
	}

	return (
		<PageLayout class="p-8">
			<div class="flex flex-col gap-6">
				<h1 class="text-2xl font-light tracking-tighter text-slate-900">
					Explore Releases
				</h1>

				<ReleaseExploreFilterBar
					scrollDirection={scrollDirection}
					releaseType={releaseType() ?? ""}
					sortBy={search().sort_by}
					orderBy={search().order_by}
					onReleaseTypeChange={updateReleaseType}
					onSortByChange={setSortBy}
					onOrderByChange={setOrderBy}
				/>

				<ReleaseExploreList
					releases={releases()}
					locale={i18n().locale}
					isLoading={releasesQuery.isLoading}
					isFetchingNextPage={releasesQuery.isFetchingNextPage}
					hasNextPage={releasesQuery.hasNextPage}
					limit={search().limit}
					setSentinelRef={setSentinelRef}
				/>
			</div>
		</PageLayout>
	)
}
