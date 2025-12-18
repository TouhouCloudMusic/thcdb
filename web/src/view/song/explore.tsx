import { useLingui } from "@lingui-solid/solid/macro"
import { useInfiniteQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import type { LocalizedTitle, SimpleArtist, Song } from "@thc/api"
import { type Component, For, Show } from "solid-js"

import { Link } from "~/component/atomic"
import { Select } from "~/component/atomic/form/select"
import {
	CorrectionSortFieldSelect,
	OrderBySelect,
	StickyFilterBar,
} from "~/component/feature/entity_explore"
import { PageLayout } from "~/layout"
import { createMockPaginatedSongs } from "~/mock/song"
import { useIntersectionSentinel } from "~/utils/solid/useIntersectionSentinel"
import type { ScrollDirection } from "~/utils/solid/useScrollDirection"
import { useScrollDirection } from "~/utils/solid/useScrollDirection"

const route = getRouteApi("/song/explore")

const LANGUAGE_OPTIONS = [
	{ id: 1, label: "Japanese" },
	{ id: 2, label: "English" },
] as const

const SongItemSkeleton: Component = () => (
	<div class="animate-pulse border-b border-slate-200 py-3">
		<div class="mb-2 h-5 w-1/3 rounded bg-slate-200" />
		<div class="h-4 w-1/4 rounded bg-slate-100" />
	</div>
)

type SongItemProps = {
	song: Song
	locale: string
}

const SongItem: Component<SongItemProps> = (props) => {
	const localizedTitle = () =>
		props.song.localized_titles?.find(
			(v: LocalizedTitle) => v.language.code === props.locale,
		)?.title

	const displayTitle = () => localizedTitle() ?? props.song.title
	const originalTitle = () => (localizedTitle() ? props.song.title : undefined)

	return (
		<div class="border-b border-slate-200 py-3 last:border-b-0">
			<div class="flex min-w-0 items-baseline gap-2">
				<Link
					to="/song/$id"
					params={{ id: props.song.id.toString() }}
					class="truncate text-slate-900 no-underline hover:underline"
				>
					{displayTitle()}
				</Link>
				<Show when={originalTitle()}>
					<span class="truncate text-sm text-slate-400">{originalTitle()}</span>
				</Show>
			</div>

			<Show when={props.song.artists && 0 < props.song.artists.length}>
				<div class="mt-1 text-sm text-slate-500">
					<For each={props.song.artists}>
						{(artist: SimpleArtist, idx) => (
							<>
								<Link
									to="/artist/$id"
									params={{ id: artist.id.toString() }}
									class="text-slate-500 no-underline hover:underline"
								>
									{artist.name}
								</Link>
								<Show when={idx() < (props.song.artists?.length ?? 0) - 1}>
									<span class="text-slate-300">, </span>
								</Show>
							</>
						)}
					</For>
				</div>
			</Show>
		</div>
	)
}

type SongExploreFilterBarProps = {
	scrollDirection: () => ScrollDirection
	languageId: string
	sortBy: "created_at" | "handled_at" | undefined
	orderBy: "asc" | "desc" | undefined
	onLanguageChange: (value: string) => void
	onSortByChange: (value: "created_at" | "handled_at") => void
	onOrderByChange: (value: "asc" | "desc") => void
}

function SongExploreFilterBar(props: SongExploreFilterBarProps) {
	return (
		<StickyFilterBar scrollDirection={props.scrollDirection}>
			<div class="flex items-center gap-4">
				<div class="flex items-center gap-2">
					<span class="text-sm text-slate-500">Language</span>
					<Select
						value={props.languageId}
						onChange={(e) => props.onLanguageChange(e.currentTarget.value)}
					>
						<Select.Option value="">All</Select.Option>
						<For each={LANGUAGE_OPTIONS}>
							{(lang) => (
								<Select.Option value={lang.id.toString()}>
									{lang.label}
								</Select.Option>
							)}
						</For>
					</Select>
				</div>

				<CorrectionSortFieldSelect
					value={props.sortBy}
					onChange={props.onSortByChange}
				/>

				<OrderBySelect
					value={props.orderBy}
					onChange={props.onOrderByChange}
				/>
			</div>
		</StickyFilterBar>
	)
}

type SongExploreListProps = {
	songs: Song[]
	locale: string
	isFetchingNextPage: boolean
	hasNextPage: boolean
	limit: number
	setSentinelRef: (el: HTMLDivElement | undefined) => void
}

function SongExploreList(props: SongExploreListProps) {
	return (
		<>
			<div class="flex flex-col">
				<For each={props.songs}>
					{(song: Song) => (
						<SongItem
							song={song}
							locale={props.locale}
						/>
					)}
				</For>
			</div>

			<div
				ref={props.setSentinelRef}
				class="h-1"
			/>

			<Show when={props.isFetchingNextPage}>
				<div class="flex flex-col">
					<For each={Array.from({ length: props.limit })}>
						{() => <SongItemSkeleton />}
					</For>
				</div>
			</Show>

			<Show when={!props.hasNextPage && 0 < props.songs.length}>
				<div class="flex justify-center py-4 text-sm text-slate-400">
					No more songs
				</div>
			</Show>
		</>
	)
}

export const SongExplore = () => {
	const search = route.useSearch()
	const scrollDirection = useScrollDirection()

	const { i18n } = useLingui()

	const navigate = useNavigate({ from: "/song/explore" })

	const songsQuery = useInfiniteQuery(() => ({
		queryKey: [
			"song::explore",
			search().language_id,
			search().sort_by,
			search().order_by,
			search().limit,
		],
		queryFn: ({ pageParam }) => {
			return createMockPaginatedSongs({
				limit: search().limit,
				cursor: pageParam,
				language_id: search().language_id,
				sort_field: search().sort_by,
				sort_direction: search().order_by,
			})
		},
		initialPageParam: 0,
		getNextPageParam: (lastPage) => lastPage.next_cursor,
	}))

	const songs = () => songsQuery.data?.pages.flatMap((p) => p.items) ?? []

	const setSentinelRef = useIntersectionSentinel<HTMLDivElement>({
		enabled: () => songsQuery.hasNextPage && !songsQuery.isFetchingNextPage,
		onIntersect: () => {
			void songsQuery.fetchNextPage()
		},
	})

	const updateFilter = (
		key: "sort_by" | "order_by",
		value: string | undefined,
	) => {
		navigate({
			to: "/song/explore",
			search: {
				...search(),
				[key]: value || undefined,
			},
		})
	}

	const setOrderBy = (value: "asc" | "desc") => {
		updateFilter("order_by", value)
	}

	const setSortBy = (value: "created_at" | "handled_at") => {
		updateFilter("sort_by", value)
	}

	const updateLanguageId = (value: string) => {
		const parsed = Number.parseInt(value, 10)
		navigate({
			to: "/song/explore",
			search: {
				...search(),
				language_id: Number.isNaN(parsed) ? undefined : [parsed],
			},
		})
	}

	return (
		<PageLayout class="p-8">
			<div class="flex flex-col gap-6">
				<h1 class="text-2xl font-light tracking-tighter text-slate-900">
					Explore Songs
				</h1>

				<SongExploreFilterBar
					scrollDirection={scrollDirection}
					languageId={search().language_id?.[0]?.toString() ?? ""}
					sortBy={search().sort_by}
					orderBy={search().order_by}
					onLanguageChange={updateLanguageId}
					onSortByChange={setSortBy}
					onOrderByChange={setOrderBy}
				/>

				<SongExploreList
					songs={songs()}
					locale={i18n().locale}
					isFetchingNextPage={songsQuery.isFetchingNextPage}
					hasNextPage={songsQuery.hasNextPage}
					limit={search().limit}
					setSentinelRef={setSentinelRef}
				/>
			</div>
		</PageLayout>
	)
}
