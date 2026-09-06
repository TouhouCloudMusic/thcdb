import { useLingui } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import { getRouteApi } from "@tanstack/solid-router"
import { Suspense } from "solid-js"

import { ExplorePageLayout } from "~/component/feature/entity_explore"
import type { DataPageRelease } from "~/hey-api"
import { exploreReleaseOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { ReleaseExploreFilterBar } from "~/view/release/explore/filter"
import type { ReleaseExploreFilterStore } from "~/view/release/explore/filter"
import {
	ReleaseExploreList,
	ReleaseExploreListSkeleton,
} from "~/view/release/explore/list"
import type { ReleaseExploreListStore } from "~/view/release/explore/list"

const route = getRouteApi("/release/explore")

type ReleaseExploreQuery = {
	data: DataPageRelease | undefined
	isLoading: boolean
}

// typescript cannot infer return type of use search
// oxlint-disable-next-line no-underscore-dangle
const _use_search_result = () => route.useSearch()
type ReleaseExploreStoreDeps = {
	search: ReturnType<typeof _use_search_result>
	navigate: ReturnType<typeof route.useNavigate>
	releasesQuery: ReleaseExploreQuery
}

type ReleaseExploreStores = {
	filterStore: ReleaseExploreFilterStore
	listStore: ReleaseExploreListStore
}

function createReleaseExploreStores(
	deps: ReleaseExploreStoreDeps,
): ReleaseExploreStores {
	const { search, navigate, releasesQuery } = deps

	const filterStore: ReleaseExploreFilterStore = {
		get releaseType() {
			return search().release_type
		},
		get sortBy() {
			return search().sort_by ?? "release_date"
		},
		get orderBy() {
			return search().order_by
		},
		get displayType() {
			return search().display_type
		},
		setReleaseType: (value) => {
			void navigate({
				to: ".",
				search: (prev) => ({
					...prev,
					release_type: value,
					page: 1,
				}),
			})
		},
		setSortBy: (value) => {
			void navigate({
				to: ".",
				search: (prev) => ({
					...prev,
					sort_by: value,
					page: 1,
				}),
			})
		},
		setOrderBy: (value) => {
			void navigate({
				to: ".",
				search: (prev) => ({
					...prev,
					order_by: value,
					page: 1,
				}),
			})
		},
		setDisplayType: (value) => {
			void navigate({
				to: ".",
				search: (prev) => ({ ...prev, display_type: value }),
			})
		},
	}

	const listStore: ReleaseExploreListStore = {
		get releases() {
			return releasesQuery.data?.data.items ?? []
		},
		get isLoading() {
			return releasesQuery.isLoading
		},
		get limit() {
			return search().limit
		},
		get page() {
			return search().page
		},
		setPage: (page: number) => {
			void navigate({
				search: (prev) => ({ ...prev, page }),
			})
		},
		get displayType() {
			return search().display_type
		},
		get totalPages() {
			return releasesQuery.data?.data.total_pages ?? 0
		},
	}

	return { filterStore, listStore }
}

export function ReleaseExplore() {
	const { t } = useLingui()

	const search = route.useSearch()
	const navigate = route.useNavigate()
	const releasesQuery = useQuery(() => {
		const snapshot = search()
		return exploreReleaseOptions({
			query: {
				limit: snapshot.limit,
				page: snapshot.page,
				release_type: snapshot.release_type
					? [snapshot.release_type]
					: undefined,
				sort_field: snapshot.sort_by ?? "release_date",
				sort_direction: snapshot.order_by,
			},
		})
	})

	const { filterStore, listStore } = createReleaseExploreStores({
		search,
		navigate,
		releasesQuery,
	})

	return (
		<ExplorePageLayout
			title={t`Explore Releases`}
			action={{ to: "/release/new", label: t`Create release` }}
		>
			<ReleaseExploreFilterBar store={filterStore} />

			{/** TODO: Move skeleton to each type of view */}
			<Suspense
				fallback={
					<ReleaseExploreListSkeleton
						limit={listStore.limit}
						displayType={listStore.displayType}
					/>
				}
			>
				<ReleaseExploreList store={listStore} />
			</Suspense>
		</ExplorePageLayout>
	)
}
