import { useLingui } from "@lingui/solid/macro"
import { useInfiniteQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { createMemo, For, Show } from "solid-js"
import type { JSX } from "solid-js"
import { twJoin } from "tailwind-merge"

import { Tab } from "~/component/atomic"
import { Divider } from "~/component/atomic/Divider"
import { Intersperse } from "~/component/data/Intersperse"
import {
	searchArtistInfiniteOptions,
	searchEventInfiniteOptions,
	searchLabelInfiniteOptions,
	searchReleaseInfiniteOptions,
	searchSongInfiniteOptions,
	searchTagInfiniteOptions,
	searchUserCollectionsInfiniteOptions,
} from "~/hey-api/@tanstack/solid-query.gen"
import { PageLayout } from "~/layout/PageLayout"
import { createInfiniteScroll } from "~/utils/solid/createInfiniteScroll"
import { ArtistItem } from "~/view/artist/ArtistItem"
import { CollectionListItem } from "~/view/collection/CollectionListItem"
import { EventItem } from "~/view/event/EventItem"
import { LabelItem } from "~/view/label/LabelItem"
import { ReleaseItem } from "~/view/release/ReleaseItems"
import { SongItem } from "~/view/song/SongItem"
import { TagItem } from "~/view/tag/TagItem"

type SearchTab =
	| "artist"
	| "event"
	| "label"
	| "release"
	| "song"
	| "tag"
	| "user_collection"
type SearchEntity = "all" | SearchTab

const route = getRouteApi("/search")
const LIMIT = 20

function isSearchTab(value: string): value is SearchTab {
	return (
		value === "artist"
		|| value === "release"
		|| value === "song"
		|| value === "event"
		|| value === "label"
		|| value === "tag"
		|| value === "user_collection"
	)
}

export function SearchPage() {
	const { t } = useLingui()
	const search = route.useSearch()
	const navigate = useNavigate({ from: "/search" })

	const term = createMemo(() => (search().q ?? "").trim())
	const entity = createMemo(() => search().entity ?? "all")
	const requestedTab = createMemo<SearchTab | undefined>(() => search().tab)

	const patchSearch = (patch: { tab?: SearchTab }) => {
		void navigate({
			to: "/search",
			search: { ...search(), ...patch },
		})
	}

	const enabled = () => term().length > 0

	return (
		<PageLayout class="p-4 sm:p-8">
			<div class="flex h-full flex-col gap-6">
				<SearchHeader
					enabled={enabled()}
					term={term()}
				/>

				<div class="flex min-h-0 flex-1 flex-col">
					<Show
						when={enabled()}
						fallback={<EmptyState text={t`Type a keyword to search.`} />}
					>
						<SearchResults
							term={term}
							entity={entity}
							requestedTab={requestedTab}
							onTabChange={(value) => {
								patchSearch({ tab: value })
							}}
						/>
					</Show>
				</div>
			</div>
		</PageLayout>
	)
}

function SearchHeader(props: { enabled: boolean; term: string }) {
	const { t } = useLingui()
	return (
		<div class="flex flex-col border-b border-slate-200 pb-4">
			<Show when={props.enabled}>
				<h1 class="text-2xl font-light wrap-anywhere text-primary">
					{t`Search result of`} <span class="text-secondary">{props.term}</span>
				</h1>
			</Show>
		</div>
	)
}

function SearchResults(props: {
	term: () => string
	entity: () => SearchEntity
	requestedTab: () => SearchTab | undefined
	onTabChange: (tab: SearchTab) => void
}) {
	const { t } = useLingui()
	const enabled = () => props.term().length > 0

	const isEnabledTab = (tab: SearchTab) => {
		if (!enabled()) return false
		if (props.entity() === "all") return true
		return props.entity() === tab
	}

	const artistsQuery = useInfiniteQuery(() => ({
		...searchArtistInfiniteOptions({
			query: { search_term: props.term(), limit: LIMIT },
		}),
		initialPageParam: 0,
		getNextPageParam: (last) => last.data.next_cursor,
		enabled: isEnabledTab("artist"),
		throwOnError: true,
	}))
	const eventsQuery = useInfiniteQuery(() => ({
		...searchEventInfiniteOptions({
			query: { search_term: props.term(), limit: LIMIT },
		}),
		initialPageParam: 0,
		getNextPageParam: (last) => last.data.next_cursor,
		enabled: isEnabledTab("event"),
		throwOnError: true,
	}))
	const labelsQuery = useInfiniteQuery(() => ({
		...searchLabelInfiniteOptions({
			query: { search_term: props.term(), limit: LIMIT },
		}),
		initialPageParam: 0,
		getNextPageParam: (last) => last.data.next_cursor,
		enabled: isEnabledTab("label"),
		throwOnError: true,
	}))
	const releasesQuery = useInfiniteQuery(() => ({
		...searchReleaseInfiniteOptions({
			query: { search_term: props.term(), limit: LIMIT },
		}),
		initialPageParam: 0,
		getNextPageParam: (last) => last.data.next_cursor,
		enabled: isEnabledTab("release"),
		throwOnError: true,
	}))
	const songsQuery = useInfiniteQuery(() => ({
		...searchSongInfiniteOptions({
			query: { search_term: props.term(), limit: LIMIT },
		}),
		initialPageParam: 0,
		getNextPageParam: (last) => last.data.next_cursor,
		enabled: isEnabledTab("song"),
		throwOnError: true,
	}))
	const tagsQuery = useInfiniteQuery(() => ({
		...searchTagInfiniteOptions({
			query: { search_term: props.term(), limit: LIMIT },
		}),
		initialPageParam: 0,
		getNextPageParam: (last) => last.data.next_cursor,
		enabled: isEnabledTab("tag"),
		throwOnError: true,
	}))
	const userCollectionsQuery = useInfiniteQuery(() => ({
		...searchUserCollectionsInfiniteOptions({
			query: { keyword: props.term(), limit: LIMIT },
		}),
		initialPageParam: 1,
		getNextPageParam: (last) =>
			last.data.page < last.data.total_pages ? last.data.page + 1 : undefined,
		enabled: isEnabledTab("user_collection"),
		throwOnError: true,
	}))
	const artists = () =>
		artistsQuery.data?.pages.flatMap((page) => page.data.items) ?? []
	const events = () =>
		eventsQuery.data?.pages.flatMap((page) => page.data.items) ?? []
	const labels = () =>
		labelsQuery.data?.pages.flatMap((page) => page.data.items) ?? []
	const releases = () =>
		releasesQuery.data?.pages.flatMap((page) => page.data.items) ?? []
	const songs = () =>
		songsQuery.data?.pages.flatMap((page) => page.data.items) ?? []
	const tags = () =>
		tagsQuery.data?.pages.flatMap((page) => page.data.items) ?? []
	const userCollections = () =>
		userCollectionsQuery.data?.pages.flatMap((page) => page.data.items) ?? []

	const itemCount = (tab: SearchTab) => {
		if (tab === "artist") return artists().length
		if (tab === "event") return events().length
		if (tab === "label") return labels().length
		if (tab === "release") return releases().length
		if (tab === "song") return songs().length
		if (tab === "user_collection") return userCollections().length
		return tags().length
	}

	const isLoadingTab = (tab: SearchTab) => {
		if (tab === "artist") return artistsQuery.isLoading
		if (tab === "event") return eventsQuery.isLoading
		if (tab === "label") return labelsQuery.isLoading
		if (tab === "release") return releasesQuery.isLoading
		if (tab === "song") return songsQuery.isLoading
		if (tab === "user_collection") return userCollectionsQuery.isLoading
		return tagsQuery.isLoading
	}

	const isLoadingAny = () => {
		return (
			artistsQuery.isLoading
			|| eventsQuery.isLoading
			|| labelsQuery.isLoading
			|| releasesQuery.isLoading
			|| songsQuery.isLoading
			|| tagsQuery.isLoading
			|| userCollectionsQuery.isLoading
		)
	}

	const visibleTabs = createMemo<SearchTab[]>(() => {
		const currentEntity = props.entity()
		if (currentEntity !== "all") {
			if (itemCount(currentEntity) > 0) return [currentEntity]
			if (isLoadingTab(currentEntity)) return [currentEntity]
			return []
		}

		if (isLoadingAny()) return []

		return (
			[
				"artist",
				"release",
				"song",
				"event",
				"label",
				"tag",
				"user_collection",
			] satisfies SearchTab[]
		).filter((tab) => itemCount(tab) > 0)
	})

	const activeTab = createMemo<SearchTab | undefined>(() => {
		const visible = visibleTabs()
		if (visible.length === 0) return

		const requested = props.requestedTab()
		if (requested && visible.includes(requested)) return requested
		return visible[0]
	})

	const setArtistsSentinelRef = createInfiniteScroll({
		enabled: () =>
			activeTab() === "artist"
			&& artistsQuery.hasNextPage
			&& !artistsQuery.isFetchingNextPage,
		onLoadMore: () => {
			void artistsQuery.fetchNextPage()
		},
	})

	const setReleasesSentinelRef = createInfiniteScroll({
		enabled: () =>
			activeTab() === "release"
			&& releasesQuery.hasNextPage
			&& !releasesQuery.isFetchingNextPage,
		onLoadMore: () => {
			void releasesQuery.fetchNextPage()
		},
	})

	const setSongsSentinelRef = createInfiniteScroll({
		enabled: () =>
			activeTab() === "song"
			&& songsQuery.hasNextPage
			&& !songsQuery.isFetchingNextPage,
		onLoadMore: () => {
			void songsQuery.fetchNextPage()
		},
	})

	const setEventsSentinelRef = createInfiniteScroll({
		enabled: () =>
			activeTab() === "event"
			&& eventsQuery.hasNextPage
			&& !eventsQuery.isFetchingNextPage,
		onLoadMore: () => {
			void eventsQuery.fetchNextPage()
		},
	})

	const setLabelsSentinelRef = createInfiniteScroll({
		enabled: () =>
			activeTab() === "label"
			&& labelsQuery.hasNextPage
			&& !labelsQuery.isFetchingNextPage,
		onLoadMore: () => {
			void labelsQuery.fetchNextPage()
		},
	})

	const setTagsSentinelRef = createInfiniteScroll({
		enabled: () =>
			activeTab() === "tag"
			&& tagsQuery.hasNextPage
			&& !tagsQuery.isFetchingNextPage,
		onLoadMore: () => {
			void tagsQuery.fetchNextPage()
		},
	})

	const setUserCollectionsSentinelRef = createInfiniteScroll({
		enabled: () =>
			activeTab() === "user_collection"
			&& userCollectionsQuery.hasNextPage
			&& !userCollectionsQuery.isFetchingNextPage,
		onLoadMore: () => {
			void userCollectionsQuery.fetchNextPage()
		},
	})

	return (
		<Show
			when={visibleTabs().length > 0 && activeTab()}
			fallback={
				<Show
					when={!isLoadingAny()}
					fallback={
						<EmptyState
							text={t`Searching…`}
							variant="fill"
						/>
					}
				>
					<EmptyState
						text={t`No results found.`}
						variant="fill"
					/>
				</Show>
			}
		>
			<Tab.Root
				value={activeTab()}
				onChange={(value) => {
					if (!value) return
					if (!isSearchTab(value)) return
					props.onTabChange(value)
				}}
			>
				<div class="overflow-x-auto">
					<Tab.List class={twJoin(Tab.CONTAINER_CLASS, "min-w-max")}>
						<For each={visibleTabs()}>
							{(tab) => (
								<TabTrigger
									tab={tab}
									count={itemCount(tab)}
								/>
							)}
						</For>
						<Tab.Indicator />
					</Tab.List>
				</div>

				<Tab.Content value="artist">
					<ResultList
						items={artists()}
						isLoading={artistsQuery.isLoading}
						isFetchingNextPage={artistsQuery.isFetchingNextPage}
						hasNextPage={artistsQuery.hasNextPage}
						limit={LIMIT}
						setSentinelRef={setArtistsSentinelRef}
						emptyText={t`No artists found.`}
						renderItem={(result) => <ArtistItem artist={result.item} />}
					/>
				</Tab.Content>

				<Tab.Content value="event">
					<ResultList
						items={events()}
						isLoading={eventsQuery.isLoading}
						isFetchingNextPage={eventsQuery.isFetchingNextPage}
						hasNextPage={eventsQuery.hasNextPage}
						limit={LIMIT}
						setSentinelRef={setEventsSentinelRef}
						emptyText={t`No events found.`}
						renderItem={(result) => <EventItem event={result.item} />}
					/>
				</Tab.Content>

				<Tab.Content value="label">
					<ResultList
						items={labels()}
						isLoading={labelsQuery.isLoading}
						isFetchingNextPage={labelsQuery.isFetchingNextPage}
						hasNextPage={labelsQuery.hasNextPage}
						limit={LIMIT}
						setSentinelRef={setLabelsSentinelRef}
						emptyText={t`No labels found.`}
						renderItem={(result) => <LabelItem label={result.item} />}
					/>
				</Tab.Content>

				<Tab.Content value="release">
					<ResultList
						items={releases()}
						isLoading={releasesQuery.isLoading}
						isFetchingNextPage={releasesQuery.isFetchingNextPage}
						hasNextPage={releasesQuery.hasNextPage}
						limit={LIMIT}
						setSentinelRef={setReleasesSentinelRef}
						emptyText={t`No releases found.`}
						renderItem={(result) => <ReleaseItem release={result.item} />}
					/>
				</Tab.Content>

				<Tab.Content value="song">
					<ResultList
						items={songs()}
						isLoading={songsQuery.isLoading}
						isFetchingNextPage={songsQuery.isFetchingNextPage}
						hasNextPage={songsQuery.hasNextPage}
						limit={LIMIT}
						setSentinelRef={setSongsSentinelRef}
						emptyText={t`No songs found.`}
						renderItem={(result) => <SongItem song={result.item} />}
					/>
				</Tab.Content>

				<Tab.Content value="tag">
					<ResultList
						items={tags()}
						isLoading={tagsQuery.isLoading}
						isFetchingNextPage={tagsQuery.isFetchingNextPage}
						hasNextPage={tagsQuery.hasNextPage}
						limit={LIMIT}
						setSentinelRef={setTagsSentinelRef}
						emptyText={t`No tags found.`}
						renderItem={(result) => <TagItem tag={result.item} />}
					/>
				</Tab.Content>

				<Tab.Content value="user_collection">
					<ResultList
						items={userCollections()}
						isLoading={userCollectionsQuery.isLoading}
						isFetchingNextPage={userCollectionsQuery.isFetchingNextPage}
						hasNextPage={userCollectionsQuery.hasNextPage}
						limit={LIMIT}
						setSentinelRef={setUserCollectionsSentinelRef}
						emptyText={t`No collections found.`}
						renderItem={(collection) => (
							<CollectionListItem collection={collection} />
						)}
					/>
				</Tab.Content>
			</Tab.Root>
		</Show>
	)
}

type EmptyStateVariant = "compact" | "fill"

function EmptyState(props: { text: string; variant?: EmptyStateVariant }) {
	const variant = () => {
		if (props.variant === "fill") {
			return "grid flex-1 place-items-center p-8"
		}
		return "max-h-40 overflow-auto px-4 py-8"
	}

	return (
		<div class={`text-center text-sm text-tertiary ${variant()}`}>
			{props.text}
		</div>
	)
}

function TabTrigger(props: { tab: SearchTab; count: number }) {
	return (
		<Tab.Trigger
			value={props.tab}
			class="flex items-center gap-2 py-3"
		>
			<SearchTabLabel tab={props.tab} />
			<span class="text-sm tabular-nums text-tertiary">{props.count}</span>
		</Tab.Trigger>
	)
}

function SearchTabLabel(props: { tab: SearchTab }) {
	const { t } = useLingui()

	const label = () => {
		switch (props.tab) {
			case "artist": {
				return t`Artists`
			}
			case "event": {
				return t`Events`
			}
			case "label": {
				return t`Labels`
			}
			case "release": {
				return t`Releases`
			}
			case "song": {
				return t`Songs`
			}
			case "tag": {
				return t`Tags`
			}
			case "user_collection": {
				return t`Collections`
			}
		}
	}

	return <>{label()}</>
}

type ResultListProps<T> = {
	items: T[]
	isLoading: boolean
	isFetchingNextPage: boolean
	hasNextPage: boolean
	limit: number
	setSentinelRef: (el: HTMLDivElement) => void
	emptyText: string
	renderItem: (item: T) => JSX.Element
}

function ResultList<T>(props: ResultListProps<T>) {
	const { t } = useLingui()

	return (
		<div class="relative flex flex-col gap-2 p-4">
			<Show when={!props.isLoading && props.items.length === 0}>
				<div class="py-8 text-center text-sm text-tertiary">
					{props.emptyText}
				</div>
			</Show>

			<Intersperse
				of={props.items}
				with={<Divider horizontal />}
			>
				{(item) => props.renderItem(item)}
			</Intersperse>

			<Show when={props.items.length > 0 && !props.hasNextPage}>
				<div class="flex flex-col">
					<Divider horizontal />
					<div class="flex h-16 items-center justify-center text-sm text-slate-500">
						{t`No more results`}
					</div>
				</div>
			</Show>

			<Show when={props.isFetchingNextPage || props.isLoading}>
				<Show when={props.items.length > 0}>
					<Divider horizontal />
				</Show>
				<Intersperse
					of={Array.from({ length: props.limit })}
					with={<Divider horizontal />}
				>
					{() => <RowSkeleton />}
				</Intersperse>
			</Show>

			<div
				ref={props.setSentinelRef}
				class="absolute inset-x-0 bottom-0 h-1"
			></div>
		</div>
	)
}

function RowSkeleton() {
	return (
		<div class="motion-safe:animate-pulse min-w-0">
			<div class="h-4 w-2/5 rounded bg-slate-200"></div>
			<div class="mt-2 h-3 w-1/4 rounded bg-slate-100"></div>
		</div>
	)
}
