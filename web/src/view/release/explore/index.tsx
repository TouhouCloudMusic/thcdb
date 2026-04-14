import { t } from "@lingui/core/macro"
import { useQuery } from "@tanstack/solid-query"
import { getRouteApi } from "@tanstack/solid-router"
import { ReleaseApi } from "@thc/api"
import type { Release } from "@thc/api"
import { Either } from "effect"
import { Suspense } from "solid-js"

import { ExplorePageLayout } from "~/component/feature/entity_explore"
import { useI18N } from "~/state/i18n"
import { useScrollDirection } from "~/utils/solid/useScrollDirection"
import { ReleaseExploreFilterBar } from "~/view/release/explore/filter"
import type { ReleaseExploreFilterStore } from "~/view/release/explore/filter"
import {
	ReleaseExploreList,
	ReleaseExploreListSkeleton,
} from "~/view/release/explore/list"
import type { ReleaseExploreListStore } from "~/view/release/explore/list"

const route = getRouteApi("/release/explore")

type ReleaseExploreQuery = {
	data: { items?: Release[]; total_pages?: number } | undefined
	isLoading: boolean
}

// typescript cannot infer return type of use search
const _use_search_result = () => route.useSearch()
type ReleaseExploreStoreDeps = {
	search: ReturnType<typeof _use_search_result>
	navigate: ReturnType<typeof route.useNavigate>
	i18n: ReturnType<typeof useI18N>
	releasesQuery: ReleaseExploreQuery
}

type ReleaseExploreStores = {
	filterStore: ReleaseExploreFilterStore
	listStore: ReleaseExploreListStore
}

function createReleaseExploreStores(
	deps: ReleaseExploreStoreDeps,
): ReleaseExploreStores {
	const { search, navigate, i18n, releasesQuery } = deps

	const filterStore: ReleaseExploreFilterStore = {
		get releaseType() {
			return search().release_type
		},
		get sortBy() {
			return search().sort_by
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
			return releasesQuery.data?.items ?? []
		},
		get locale() {
			return i18n.locale()
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
			return releasesQuery.data?.total_pages ?? 0
		},
	}

	return { filterStore, listStore }
}

export function ReleaseExplore() {
	const scrollDirection = useScrollDirection()
	const i18n = useI18N()

	const search = route.useSearch()
	const navigate = route.useNavigate()
	const releasesQuery = useQuery(() => ({
		queryKey: [
			"release::explore",
			search().page,
			search().release_type,
			search().sort_by,
			search().order_by,
			search().limit,
		],
		queryFn: async () => {
			const snapshot = search()
			return Either.getOrThrowWith(
				await ReleaseApi.explore({
					query: {
						limit: snapshot.limit,
						page: snapshot.page,
						release_type: snapshot.release_type
							? [snapshot.release_type]
							: undefined,
						sort_field: snapshot.sort_by,
						sort_direction: snapshot.order_by,
					},
				}),
				(error) => {
					throw error
				},
			)
		},
	}))

	const { filterStore, listStore } = createReleaseExploreStores({
		search,
		navigate,
		i18n,
		releasesQuery,
	})

	return (
		<ExplorePageLayout
			title={t`Explore Releases`}
			action={{ to: "/release/new", label: t`Create release` }}
		>
			<ReleaseExploreFilterBar
				scrollDirection={scrollDirection}
				store={filterStore}
			/>

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
