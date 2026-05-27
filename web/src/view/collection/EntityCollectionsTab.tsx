import { useLingui } from "@lingui/solid/macro"
import { keepPreviousData, useInfiniteQuery } from "@tanstack/solid-query"
import { createMemo, createSignal, For, Match, Switch } from "solid-js"

import type {
	EntityUserCollectionSort,
	EntityUserCollectionTarget,
} from "~/hey-api"
import { entityUserCollectionsInfiniteOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { getNextPageParam } from "~/utils/query"
import { CollectionLoadMore } from "~/view/collection/CollectionLoadMore"
import { CollectionStatusMessage } from "~/view/collection/CollectionStatusMessage"
import type { CollectionToolbarSelectOption } from "~/view/collection/CollectionToolbarSelect"
import { CollectionToolbarSelect } from "~/view/collection/CollectionToolbarSelect"
import { FollowedCollectionRow } from "~/view/collection/FollowedCollectionRow"

const PAGE_LIMIT = 20

export function EntityCollectionsTab(props: {
	entityType: EntityUserCollectionTarget
	entityId: number
	enabled: boolean
}) {
	const { t } = useLingui()

	const [sortBy, setSortBy] =
		createSignal<EntityUserCollectionSort>("collected_at")

	const sortOptions = createMemo<
		CollectionToolbarSelectOption<EntityUserCollectionSort>[]
	>(() => [
		{
			value: "collected_at",
			label: t`Sort: Collected time`,
			itemLabel: t`Collected time`,
		},
		{
			value: "follower_count",
			label: t`Sort: Follow count`,
			itemLabel: t`Follow count`,
		},
	])

	const collectionsQuery = useInfiniteQuery(() => {
		const options = entityUserCollectionsInfiniteOptions({
			path: {
				entity_type: props.entityType,
				id: props.entityId,
			},
			query: {
				limit: PAGE_LIMIT,
				sort_by: sortBy(),
			},
		})
		options.initialPageParam = 1
		options.getNextPageParam = getNextPageParam
		options.placeholderData = keepPreviousData
		options.enabled = props.enabled
		return options
	})

	const collections = createMemo(() => {
		if (!collectionsQuery.isSuccess) return []
		return collectionsQuery.data.pages.flatMap((page) => page.data.items)
	})

	return (
		<div class="flex flex-col gap-4">
			<div class="flex justify-end">
				<CollectionToolbarSelect
					options={sortOptions()}
					value={sortBy()}
					placeholder={t`Sort`}
					ariaLabel={t`Sort collections`}
					class="min-w-36"
					onChange={setSortBy}
				/>
			</div>
			<Switch
				fallback={
					<CollectionStatusMessage>{t`No collections`}</CollectionStatusMessage>
				}
			>
				<Match when={collections().length > 0}>
					<ul class="divide-y divide-slate-100 border-y border-slate-200">
						<For each={collections()}>
							{(collection) => <FollowedCollectionRow item={collection} />}
						</For>
					</ul>
					<div>
						<CollectionLoadMore
							when={
								collectionsQuery.hasNextPage
								|| collectionsQuery.isFetchingNextPage
							}
							isLoading={collectionsQuery.isFetchingNextPage}
							onLoadMore={() => {
								void collectionsQuery.fetchNextPage()
							}}
						/>
					</div>
				</Match>
				<Match when={collectionsQuery.isLoading}>
					<CollectionStatusMessage>{t`Loading...`}</CollectionStatusMessage>
				</Match>
				<Match when={collectionsQuery.isError}>
					<CollectionStatusMessage>
						{t`Failed to load collections`}
					</CollectionStatusMessage>
				</Match>
			</Switch>
		</div>
	)
}
