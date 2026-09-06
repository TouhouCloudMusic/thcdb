import { useLingui } from "@lingui/solid/macro"
import { For, Match, Show, Switch } from "solid-js"

import { Pagination } from "~/component/Pagination"
import { Divider } from "~/component/atomic/Divider"
import { Intersperse } from "~/component/data/Intersperse"
import { EmptyExplorePlaceholder } from "~/component/feature/entity_explore"
import type { ViewMode } from "~/component/feature/entity_explore"
import type { ReleaseListItem } from "~/hey-api"
import { ReleaseGridItem, ReleaseItem } from "~/view/release/ReleaseItems"

const GRID_CONTAINER_CLASS =
	"grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5"

function ReleaseItemSkeleton() {
	return (
		<div class="animate-pulse grid grid-cols-[3lh_minmax(0,1fr)] items-start gap-3 leading-6">
			<div class="aspect-square rounded-sm bg-secondary"></div>
			<div>
				<div class="mb-2 h-5 w-2/3 rounded bg-slate-200"></div>
				<div class="h-4 w-1/2 rounded bg-slate-100"></div>
			</div>
		</div>
	)
}

function ReleaseGridItemSkeleton() {
	return (
		<div class="animate-pulse">
			<div class="aspect-square rounded-md border border-slate-200 bg-slate-100"></div>
			<div class="mt-2 h-4 w-3/4 rounded bg-slate-200"></div>
			<div class="mt-1 h-3 w-1/2 rounded bg-slate-100"></div>
		</div>
	)
}

export type ReleaseExploreListSkeletonProps = {
	limit: number
	displayType: ViewMode
}

export function ReleaseExploreListSkeleton(
	props: ReleaseExploreListSkeletonProps,
) {
	return (
		<Switch>
			<Match when={props.displayType === "list"}>
				<div class="flex flex-col gap-2 p-4">
					<Intersperse
						of={Array.from({ length: props.limit })}
						with={<Divider horizontal />}
					>
						{() => <ReleaseItemSkeleton />}
					</Intersperse>
				</div>
			</Match>
			<Match when={props.displayType === "grid"}>
				<div class={GRID_CONTAINER_CLASS}>
					<For each={Array.from({ length: props.limit })}>
						{() => <ReleaseGridItemSkeleton />}
					</For>
				</div>
			</Match>
		</Switch>
	)
}

export type ReleaseExploreListStore = {
	releases: ReleaseListItem[]
	isLoading: boolean
	limit: number
	page: number
	displayType: ViewMode
	totalPages: number
	setPage: (page: number) => void
}

export type ReleaseExploreListProps = {
	store: ReleaseExploreListStore
}

export function ReleaseExploreList(props: ReleaseExploreListProps) {
	const { t } = useLingui()
	return (
		<>
			<Show when={!props.store.isLoading && props.store.releases.length === 0}>
				<EmptyExplorePlaceholder
					title={t`No releases found`}
					action={{ to: "/release/new" }}
				/>
			</Show>

			<Switch>
				<Match when={props.store.displayType === "list"}>
					<Show when={props.store.releases.length > 0 || props.store.isLoading}>
						<div class="flex flex-col gap-2 p-4">
							<Intersperse
								of={props.store.releases}
								with={<Divider horizontal />}
							>
								{(release) => <ReleaseItem release={release} />}
							</Intersperse>
							<Show when={props.store.isLoading}>
								<Show when={props.store.releases.length > 0}>
									<Divider horizontal />
								</Show>
								<Intersperse
									of={Array.from({ length: props.store.limit })}
									with={<Divider horizontal />}
								>
									{() => <ReleaseItemSkeleton />}
								</Intersperse>
							</Show>
						</div>
					</Show>
				</Match>
				<Match when={props.store.displayType === "grid"}>
					<div class={GRID_CONTAINER_CLASS}>
						<For each={props.store.releases}>
							{(release) => <ReleaseGridItem release={release} />}
						</For>
					</div>
				</Match>
			</Switch>

			<Show when={props.store.isLoading && props.store.displayType === "grid"}>
				<ReleaseExploreListSkeleton
					limit={props.store.limit}
					displayType={props.store.displayType}
				/>
			</Show>

			<Show when={props.store.totalPages > 1}>
				<div class="flex justify-center py-6">
					<Pagination
						current={props.store.page}
						total={props.store.totalPages}
						onPageChange={props.store.setPage}
					/>
				</div>
			</Show>
		</>
	)
}
