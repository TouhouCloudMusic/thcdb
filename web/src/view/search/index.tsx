import { useLingui } from "@lingui/solid/macro"
import { useInfiniteQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import type {
	SimpleArtist,
	SimpleEvent,
	SimpleLabel,
	SongRelease,
	SongRef,
	TagRef,
	UserCollection,
} from "@thc/api"
import { SearchQueryOption } from "@thc/query"
import { createMemo, For, Show } from "solid-js"
import type { JSX } from "solid-js"

import { Tab } from "~/component/atomic"
import { Link } from "~/component/atomic/Link"
import { PageLayout } from "~/layout/PageLayout"
import { imgUrl } from "~/utils/adapter/static_file"
import { useIntersectionSentinel } from "~/utils/solid/useIntersectionSentinel"

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

const isSearchTab = (value: string): value is SearchTab => {
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
	const entity = createMemo<SearchEntity>(() => {
		const value = search().entity
		if (value === "all") return value
		if (value && isSearchTab(value)) return value
		return "all"
	})
	const requestedTab = createMemo<SearchTab | undefined>(() => search().tab)

	const patchSearch = (patch: { tab?: SearchTab }) => {
		void navigate({
			to: "/search",
			search: { ...search(), ...patch },
		})
	}

	const enabled = () => term().length > 0

	return (
		<PageLayout class="p-8 pt-6">
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
				<div class="text-3xl leading-tight font-extralight tracking-tighter text-primary">
					{t`Search result of`} &quot;
					<span class="tracking-tight">{props.term}</span>
					&quot;
				</div>
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

	const artistsQuery = useInfiniteQuery(() =>
		SearchQueryOption.artists(props.term(), LIMIT, isEnabledTab("artist")),
	)
	const eventsQuery = useInfiniteQuery(() =>
		SearchQueryOption.events(props.term(), LIMIT, isEnabledTab("event")),
	)
	const labelsQuery = useInfiniteQuery(() =>
		SearchQueryOption.labels(props.term(), LIMIT, isEnabledTab("label")),
	)
	const releasesQuery = useInfiniteQuery(() =>
		SearchQueryOption.releases(props.term(), LIMIT, isEnabledTab("release")),
	)
	const songsQuery = useInfiniteQuery(() =>
		SearchQueryOption.songs(props.term(), LIMIT, isEnabledTab("song")),
	)
	const tagsQuery = useInfiniteQuery(() =>
		SearchQueryOption.tags(props.term(), LIMIT, isEnabledTab("tag")),
	)
	const userCollectionsQuery = useInfiniteQuery(() =>
		SearchQueryOption.userCollections(
			props.term(),
			LIMIT,
			isEnabledTab("user_collection"),
		),
	)

	const artists = () => artistsQuery.data?.pages.flatMap((p) => p.items) ?? []
	const events = () => eventsQuery.data?.pages.flatMap((p) => p.items) ?? []
	const labels = () => labelsQuery.data?.pages.flatMap((p) => p.items) ?? []
	const releases = () => releasesQuery.data?.pages.flatMap((p) => p.items) ?? []
	const songs = () => songsQuery.data?.pages.flatMap((p) => p.items) ?? []
	const tags = () => tagsQuery.data?.pages.flatMap((p) => p.items) ?? []
	const userCollections = (): UserCollection[] =>
		userCollectionsQuery.data?.pages.flatMap((p) => p.items) ?? []

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
			if (!isSearchTab(currentEntity)) return []
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

	const setArtistsSentinelRef = useIntersectionSentinel<HTMLDivElement>({
		enabled: () =>
			activeTab() === "artist"
			&& artistsQuery.hasNextPage
			&& !artistsQuery.isFetchingNextPage,
		onIntersect: () => {
			void artistsQuery.fetchNextPage()
		},
	})

	const setReleasesSentinelRef = useIntersectionSentinel<HTMLDivElement>({
		enabled: () =>
			activeTab() === "release"
			&& releasesQuery.hasNextPage
			&& !releasesQuery.isFetchingNextPage,
		onIntersect: () => {
			void releasesQuery.fetchNextPage()
		},
	})

	const setSongsSentinelRef = useIntersectionSentinel<HTMLDivElement>({
		enabled: () =>
			activeTab() === "song"
			&& songsQuery.hasNextPage
			&& !songsQuery.isFetchingNextPage,
		onIntersect: () => {
			void songsQuery.fetchNextPage()
		},
	})

	const setEventsSentinelRef = useIntersectionSentinel<HTMLDivElement>({
		enabled: () =>
			activeTab() === "event"
			&& eventsQuery.hasNextPage
			&& !eventsQuery.isFetchingNextPage,
		onIntersect: () => {
			void eventsQuery.fetchNextPage()
		},
	})

	const setLabelsSentinelRef = useIntersectionSentinel<HTMLDivElement>({
		enabled: () =>
			activeTab() === "label"
			&& labelsQuery.hasNextPage
			&& !labelsQuery.isFetchingNextPage,
		onIntersect: () => {
			void labelsQuery.fetchNextPage()
		},
	})

	const setTagsSentinelRef = useIntersectionSentinel<HTMLDivElement>({
		enabled: () =>
			activeTab() === "tag"
			&& tagsQuery.hasNextPage
			&& !tagsQuery.isFetchingNextPage,
		onIntersect: () => {
			void tagsQuery.fetchNextPage()
		},
	})

	const setUserCollectionsSentinelRef = useIntersectionSentinel<HTMLDivElement>(
		{
			enabled: () =>
				activeTab() === "user_collection"
				&& userCollectionsQuery.hasNextPage
				&& !userCollectionsQuery.isFetchingNextPage,
			onIntersect: () => {
				void userCollectionsQuery.fetchNextPage()
			},
		},
	)

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
				<Tab.List class="flex flex-wrap gap-x-6 gap-y-2 border-b border-slate-200">
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

				<Tab.Content value="artist">
					<ResultList
						items={artists()}
						isLoading={artistsQuery.isLoading}
						isFetchingNextPage={artistsQuery.isFetchingNextPage}
						hasNextPage={artistsQuery.hasNextPage}
						limit={LIMIT}
						setSentinelRef={setArtistsSentinelRef}
						emptyText={t`No artists found.`}
						renderItem={(item) => <ArtistRow artist={item} />}
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
						renderItem={(item) => <EventRow event={item} />}
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
						renderItem={(item) => <LabelRow label={item} />}
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
						renderItem={(item) => <ReleaseRow release={item} />}
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
						renderItem={(item) => <SongRow song={item} />}
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
						renderItem={(item) => <TagRow tag={item} />}
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
						renderItem={(item) => (
							<Link
								to="/collection/$id"
								params={{ id: String(item.id) }}
								underline={false}
								class="flex flex-col gap-1 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50"
							>
								<span class="font-medium text-slate-900">{item.name}</span>
							</Link>
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
		<div
			class={`rounded-md border border-dashed border-slate-200 bg-white text-center text-sm text-slate-500 ${variant()}`}
		>
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
			<span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 ring-1 ring-slate-200 ring-inset">
				{props.count}
			</span>
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
		<div class="mt-5 flex flex-col gap-3">
			<Show when={!props.isLoading && props.items.length === 0}>
				<div class="max-h-40 overflow-auto rounded-md border border-dashed border-slate-200 bg-white/60 px-4 py-8 text-center text-sm text-slate-500">
					{props.emptyText}
				</div>
			</Show>

			<Show when={props.items.length > 0}>
				<div class="overflow-hidden rounded-md border border-slate-200 bg-white shadow-xs">
					<div class="divide-y divide-slate-100">
						<For each={props.items}>{(item) => props.renderItem(item)}</For>
					</div>
				</div>
			</Show>

			<div
				ref={props.setSentinelRef}
				class="h-1"
			></div>

			<Show when={props.isFetchingNextPage || props.isLoading}>
				<div class="overflow-hidden rounded-md border border-slate-200 bg-white shadow-xs">
					<div class="divide-y divide-slate-100">
						<For each={Array.from({ length: props.limit })}>
							{() => <RowSkeleton />}
						</For>
					</div>
				</div>
			</Show>

			<Show when={!props.hasNextPage && props.items.length > 0}>
				<div class="flex justify-center py-4 text-sm text-slate-400">
					{t`No more results`}
				</div>
			</Show>
		</div>
	)
}

function RowSkeleton() {
	return (
		<div class="flex animate-pulse items-center gap-3 px-4 py-3">
			<div class="size-9 shrink-0 rounded-full bg-slate-200"></div>
			<div class="min-w-0 flex-1">
				<div class="h-4 w-2/5 rounded bg-slate-200"></div>
				<div class="mt-2 h-3 w-1/4 rounded bg-slate-100"></div>
			</div>
			<div class="h-3 w-10 rounded bg-slate-100"></div>
		</div>
	)
}

function ArtistRow(props: { artist: SimpleArtist }) {
	const { t } = useLingui()
	return (
		<Link
			to="/artist/$id"
			params={{ id: props.artist.id.toString() }}
			class="group flex items-center gap-3 px-4 py-3 no-underline hover:bg-slate-50 hover:no-underline"
		>
			<div class="grid size-9 place-items-center rounded-full bg-reimu-100 text-xs font-semibold text-reimu-800 ring-1 ring-reimu-200 ring-inset">
				A
			</div>
			<div class="min-w-0 flex-1">
				<div class="truncate text-sm font-medium text-slate-900">
					{props.artist.name}
				</div>
				<div class="mt-0.5 text-xs text-slate-500">
					{t`Artist`} · {props.artist.id}
				</div>
			</div>
			<div class="text-xs text-slate-400 transition-colors duration-150 group-hover:text-slate-700 motion-reduce:transition-none">
				{t`Open`} →
			</div>
		</Link>
	)
}

function ReleaseRow(props: { release: SongRelease }) {
	const { t } = useLingui()
	const coverUrl = () => imgUrl(props.release.cover_art_url)

	return (
		<Link
			to="/release/$id"
			params={{ id: props.release.id.toString() }}
			class="group flex items-center gap-3 px-4 py-3 no-underline hover:bg-slate-50 hover:no-underline"
		>
			<Show
				when={coverUrl()}
				fallback={
					<div class="grid size-9 shrink-0 place-items-center rounded-sm bg-marisa-100 text-xs font-semibold text-marisa-800 ring-1 ring-marisa-200 ring-inset">
						R
					</div>
				}
			>
				{(src) => (
					<img
						src={src()}
						alt=""
						class="size-9 shrink-0 rounded-sm bg-slate-100 object-cover ring-1 ring-marisa-200 ring-inset"
						loading="lazy"
					/>
				)}
			</Show>
			<div class="min-w-0 flex-1">
				<div class="truncate text-sm font-medium text-slate-900">
					{props.release.title}
				</div>
				<div class="mt-0.5 text-xs text-slate-500">
					{t`Release`} · {props.release.id}
				</div>
			</div>
			<div class="text-xs text-slate-400 transition-colors duration-150 group-hover:text-slate-700 motion-reduce:transition-none">
				{t`Open`} →
			</div>
		</Link>
	)
}

function SongRow(props: { song: SongRef }) {
	const { t } = useLingui()
	return (
		<Link
			to="/song/$id"
			params={{ id: props.song.id.toString() }}
			class="group flex items-center gap-3 px-4 py-3 no-underline hover:bg-slate-50 hover:no-underline"
		>
			<div class="grid size-9 place-items-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800 ring-1 ring-blue-200 ring-inset">
				♪
			</div>
			<div class="min-w-0 flex-1">
				<div class="truncate text-sm font-medium text-slate-900">
					{props.song.title}
				</div>
				<div class="mt-0.5 text-xs text-slate-500">
					{t`Song`} · {props.song.id}
				</div>
			</div>
			<div class="text-xs text-slate-400 transition-colors duration-150 group-hover:text-slate-700 motion-reduce:transition-none">
				{t`Open`} →
			</div>
		</Link>
	)
}

function EventRow(props: { event: SimpleEvent }) {
	const { t } = useLingui()
	return (
		<Link
			to="/event/$id"
			params={{ id: props.event.id.toString() }}
			class="group flex items-center gap-3 px-4 py-3 no-underline hover:bg-slate-50 hover:no-underline"
		>
			<div class="grid size-9 place-items-center rounded-full bg-green-100 text-xs font-semibold text-green-800 ring-1 ring-green-200 ring-inset">
				E
			</div>
			<div class="min-w-0 flex-1">
				<div class="truncate text-sm font-medium text-slate-900">
					{props.event.name}
				</div>
				<div class="mt-0.5 text-xs text-slate-500">
					{t`Event`} · {props.event.id}
				</div>
			</div>
			<div class="text-xs text-slate-400 transition-colors duration-150 group-hover:text-slate-700 motion-reduce:transition-none">
				{t`Open`} →
			</div>
		</Link>
	)
}

function LabelRow(props: { label: SimpleLabel }) {
	const { t } = useLingui()
	return (
		<Link
			to="/label/$id"
			params={{ id: props.label.id.toString() }}
			class="group flex items-center gap-3 px-4 py-3 no-underline hover:bg-slate-50 hover:no-underline"
		>
			<div class="grid size-9 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-800 ring-1 ring-slate-200 ring-inset">
				L
			</div>
			<div class="min-w-0 flex-1">
				<div class="truncate text-sm font-medium text-slate-900">
					{props.label.name}
				</div>
				<div class="mt-0.5 text-xs text-slate-500">
					{t`Label`} · {props.label.id}
				</div>
			</div>
			<div class="text-xs text-slate-400 transition-colors duration-150 group-hover:text-slate-700 motion-reduce:transition-none">
				{t`Open`} →
			</div>
		</Link>
	)
}

function TagRow(props: { tag: TagRef }) {
	const { t } = useLingui()
	return (
		<Link
			to="/tag/$id"
			params={{ id: props.tag.id.toString() }}
			class="group flex items-center gap-3 px-4 py-3 no-underline hover:bg-slate-50 hover:no-underline"
		>
			<div class="grid size-9 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-800 ring-1 ring-slate-200 ring-inset">
				#
			</div>
			<div class="min-w-0 flex-1">
				<div class="flex min-w-0 items-center gap-2">
					<div class="truncate text-sm font-medium text-slate-900">
						{props.tag.name}
					</div>
					<div class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 ring-1 ring-slate-200 ring-inset">
						{props.tag.type}
					</div>
				</div>
				<div class="mt-0.5 text-xs text-slate-500">
					{t`Tag`} · {props.tag.id}
				</div>
			</div>
			<div class="text-xs text-slate-400 transition-colors duration-150 group-hover:text-slate-700 motion-reduce:transition-none">
				{t`Open`} →
			</div>
		</Link>
	)
}
