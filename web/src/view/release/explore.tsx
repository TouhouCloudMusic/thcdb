import { useQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { ReleaseApi } from "@thc/api"
import type { ReleaseType } from "@thc/api"
import { Either } from "effect"

import { Link } from "~/component/atomic"
import { RELEASE_TYPES } from "~/domain/release/constants"
import { PageLayout } from "~/layout"
import { useI18N } from "~/state/i18n"
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

	const i18n = useI18N()

	const navigate = useNavigate({ from: "/release/explore" })

	const releaseType = () => search().release_type?.[0]

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
			return Either.getOrThrowWith(
				await ReleaseApi.explore({
					query: {
						limit: search().limit,
						page: search().page,
						release_type: search().release_type,
						sort_field: search().sort_by,
						sort_direction: search().order_by,
					},
				}),
				(error) => {
					throw error
				},
			)
		},
	}))

	const releases = () => releasesQuery.data?.items ?? []
	const totalPages = () => releasesQuery.data?.total_pages ?? 0

	const setPage = (page: number) => {
		navigate({
			to: "/release/explore",
			search: {
				...search(),
				page,
			},
		})
	}

	const updateFilter = (
		key: "sort_by" | "order_by",
		value: string | undefined,
	) => {
		navigate({
			to: "/release/explore",
			search: {
				...search(),
				[key]: value || undefined,
				page: 1,
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
				page: 1,
			},
		})
	}

	return (
		<PageLayout class="p-8">
			<div class="flex flex-col gap-6">
				<div class="flex items-center justify-between gap-4">
					<h1 class="text-2xl font-light tracking-tighter text-slate-900">
						Explore Releases
					</h1>
					<Link
						to="/release/new"
						class="text-sm font-light text-primary"
					>
						Create release
					</Link>
				</div>

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
					locale={i18n.locale()}
					isLoading={releasesQuery.isLoading}
					isFetching={releasesQuery.isFetching}
					limit={search().limit}
					page={search().page}
					totalPages={totalPages()}
					onPageChange={setPage}
				/>
			</div>
		</PageLayout>
	)
}
