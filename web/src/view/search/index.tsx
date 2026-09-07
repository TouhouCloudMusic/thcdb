import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useInfiniteQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { createMemo, For, Show } from "solid-js"
import type { JSX } from "solid-js"

import { Tab } from "~/component/atomic"
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
import { palette } from "~/style/color/palette.stylex"
import { dividerStyles } from "~/style/primitives"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { createInfiniteScroll } from "~/utils/solid/createInfiniteScroll"
import { ArtistItem } from "~/view/artist/ArtistItem"
import { CollectionListItem } from "~/view/collection/CollectionListItem"
import { EventItem } from "~/view/event/EventItem"
import { LabelItem } from "~/view/label/LabelItem"
import { ReleaseItem } from "~/view/release/ReleaseItems"
import { SongItem } from "~/view/song/SongItem"
import { TagItem } from "~/view/tag/TagItem"

import { animationStyles } from "../../style/animations.stylex"

const styles = stylex.create({
	tabs: { minWidth: "max-content" },
	empty: {
		textAlign: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	fillEmpty: {
		display: "grid",
		flex: "1",
		placeItems: "center",
		padding: px[32],
	},
	compactEmpty: {
		maxHeight: px[160],
		overflow: "auto",
		paddingInline: px[16],
		paddingBlock: px[32],
	},
	page: {
		padding: { default: px[16], "@media (min-width: 40rem)": px[32] },
	},
	content: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		gap: px[24],
	},
	results: {
		display: "flex",
		minHeight: "0rem",
		flex: "1",
		flexDirection: "column",
	},
	header: {
		display: "flex",
		flexDirection: "column",
		borderBottomStyle: "solid",
		borderBottomWidth: "1px",
		borderColor: palette.slate[200],
		paddingBottom: px[16],
	},
	title: {
		fontSize: fontSizes["2xl"],
		lineHeight: lineHeights["2xl"],
		fontWeight: 300,
		overflowWrap: "anywhere",
		color: colors.textPrimary,
	},
	term: { color: colors.textSecondary },
	tabViewport: { overflowX: "auto" },
	tabTrigger: {
		display: "flex",
		alignItems: "center",
		gap: px[8],
		paddingBlock: px[12],
	},
	count: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontVariantNumeric: "tabular-nums",
		color: colors.textTertiary,
	},
	resultList: {
		position: "relative",
		display: "flex",
		flexDirection: "column",
		gap: px[8],
		padding: px[16],
	},
	loading: {
		paddingBlock: px[32],
		textAlign: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	emptySection: { display: "flex", flexDirection: "column" },
	listEnd: {
		display: "flex",
		height: px[64],
		alignItems: "center",
		justifyContent: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
	},
	progress: {
		position: "absolute",
		inset: "NaNrem",
		bottom: "0rem",
		height: px[4],
	},
	skeleton: {
		minWidth: "0rem",
	},
	skeletonTitle: {
		height: px[16],
		width: "40%",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
	skeletonDescription: {
		marginTop: px[8],
		height: px[12],
		width: "25%",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
	},
})

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
		<PageLayout styles={styles.page}>
			<div {...stylex.attrs(styles.content)}>
				<SearchHeader
					enabled={enabled()}
					term={term()}
				/>

				<div {...stylex.attrs(styles.results)}>
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
		<div {...stylex.attrs(styles.header)}>
			<Show when={props.enabled}>
				<h1 {...stylex.attrs(styles.title)}>
					{t`Search result of`}{" "}
					<span {...stylex.attrs(styles.term)}>{props.term}</span>
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
				<div {...stylex.attrs(styles.tabViewport)}>
					<Tab.List styles={[Tab.containerStyles, styles.tabs]}>
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
			return styles.fillEmpty
		}
		return styles.compactEmpty
	}

	return <div {...stylex.attrs(styles.empty, variant())}>{props.text}</div>
}

function TabTrigger(props: { tab: SearchTab; count: number }) {
	return (
		<Tab.Trigger
			value={props.tab}
			styles={styles.tabTrigger}
		>
			<SearchTabLabel tab={props.tab} />
			<span {...stylex.attrs(styles.count)}>{props.count}</span>
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
		<div {...stylex.attrs(styles.resultList)}>
			<Show when={!props.isLoading && props.items.length === 0}>
				<div {...stylex.attrs(styles.loading)}>{props.emptyText}</div>
			</Show>

			<Intersperse
				of={props.items}
				with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
			>
				{(item) => props.renderItem(item)}
			</Intersperse>

			<Show when={props.items.length > 0 && !props.hasNextPage}>
				<div {...stylex.attrs(styles.emptySection)}>
					<span {...stylex.attrs(dividerStyles.horizontal)}></span>
					<div {...stylex.attrs(styles.listEnd)}>{t`No more results`}</div>
				</div>
			</Show>

			<Show when={props.isFetchingNextPage || props.isLoading}>
				<Show when={props.items.length > 0}>
					<span {...stylex.attrs(dividerStyles.horizontal)}></span>
				</Show>
				<Intersperse
					of={Array.from({ length: props.limit })}
					with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
				>
					{() => <RowSkeleton />}
				</Intersperse>
			</Show>

			<div
				ref={props.setSentinelRef}
				{...stylex.attrs(styles.progress)}
			></div>
		</div>
	)
}

function RowSkeleton() {
	return (
		<div {...stylex.attrs(animationStyles.motionSafePulse, styles.skeleton)}>
			<div
				{...stylex.attrs(animationStyles.motionSafePulse, styles.skeletonTitle)}
			></div>
			<div
				{...stylex.attrs(
					animationStyles.motionSafePulse,
					styles.skeletonDescription,
				)}
			></div>
		</div>
	)
}
