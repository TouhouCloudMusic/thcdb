import { useQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { SongApi } from "@thc/api"
import type { LocalizedTitle, SimpleArtist, Song } from "@thc/api"
import { Either } from "effect"
import { For, Show } from "solid-js"
import type { Component } from "solid-js"

import { Pagination } from "~/component/Pagination"
import { Link } from "~/component/atomic"
import { Select } from "~/component/atomic/form/select"
import {
	CorrectionSortFieldSelect,
	EmptyExplorePlaceholder,
	ExplorePageLayout,
	OrderBySelect,
	StickyFilterBar,
} from "~/component/feature/entity_explore"
import { useI18N } from "~/state/i18n"
import type { ScrollDirection } from "~/utils/solid/useScrollDirection"
import { useScrollDirection } from "~/utils/solid/useScrollDirection"

const route = getRouteApi("/song/explore")

const LANGUAGE_OPTIONS = [
	{ id: 1, label: "Japanese" },
	{ id: 2, label: "English" },
] as const

const SongItemSkeleton: Component = () => (
	<div class="animate-pulse border-b border-slate-200 py-3">
		<div class="mb-2 h-5 w-1/3 rounded bg-slate-200"></div>
		<div class="h-4 w-1/4 rounded bg-slate-100"></div>
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

			<Show when={props.song.artists && props.song.artists.length > 0}>
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
	const languageOptions = () => [
		"",
		...LANGUAGE_OPTIONS.map((lang) => lang.id.toString()),
	]

	const languageLabel = (value: string) => {
		if (value === "") return "All"
		return (
			LANGUAGE_OPTIONS.find((lang) => lang.id.toString() === value)?.label
			?? value
		)
	}

	return (
		<StickyFilterBar scrollDirection={props.scrollDirection}>
			<div class="flex items-center gap-4">
				<div class="flex items-center gap-2">
					<span class="text-sm text-slate-500">Language</span>
					<Select.Root<string>
						options={languageOptions()}
						value={props.languageId}
						onChange={(value) => props.onLanguageChange(value ?? "")}
						itemComponent={(optionProps) => (
							<Select.Item item={optionProps.item}>
								{languageLabel(optionProps.item.rawValue)}
							</Select.Item>
						)}
					>
						<Select.Trigger>
							<Select.Value<string>>
								{(state) => languageLabel(state.selectedOption() ?? "")}
							</Select.Value>
							<Select.Icon />
						</Select.Trigger>
						<Select.Portal>
							<Select.Content>
								<Select.Listbox />
							</Select.Content>
						</Select.Portal>
					</Select.Root>
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
	isLoading: boolean
	isFetching: boolean
	limit: number
	page: number
	totalPages: number
	onPageChange: (page: number) => void
}

function SongExploreList(props: SongExploreListProps) {
	return (
		<>
			<Show when={!props.isLoading && props.songs.length === 0}>
				<EmptyExplorePlaceholder
					title="No songs found"
					action={{ to: "/song/new" }}
				/>
			</Show>

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

			<Show when={props.isFetching || props.isLoading}>
				<div class="flex flex-col">
					<For each={Array.from({ length: props.limit })}>
						{() => <SongItemSkeleton />}
					</For>
				</div>
			</Show>

			<Show when={props.totalPages > 1}>
				<div class="flex justify-center py-6">
					<Pagination
						current={props.page}
						total={props.totalPages}
						onPageChange={props.onPageChange}
					/>
				</div>
			</Show>
		</>
	)
}

export const SongExplore = () => {
	const search = route.useSearch()
	const scrollDirection = useScrollDirection()

	const i18n = useI18N()

	const navigate = useNavigate({ from: "/song/explore" })

	const songsQuery = useQuery(() => ({
		queryKey: [
			"song::explore",
			search().page,
			search().language_id,
			search().sort_by,
			search().order_by,
			search().limit,
		],
		queryFn: async () => {
			return Either.getOrThrowWith(
				await SongApi.explore({
					query: {
						limit: search().limit,
						page: search().page,
						language_id: search().language_id,
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

	const songs = () => songsQuery.data?.items ?? []
	const totalPages = () => songsQuery.data?.total_pages ?? 0

	const setPage = (page: number) => {
		navigate({
			to: "/song/explore",
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
			to: "/song/explore",
			search: {
				...search(),
				[key]: value || undefined,
				page: 1,
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
				page: 1,
			},
		})
	}

	return (
		<ExplorePageLayout
			title="Explore Songs"
			action={{ to: "/song/new", label: "Create song" }}
		>
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
				locale={i18n.locale()}
				isLoading={songsQuery.isLoading}
				isFetching={songsQuery.isFetching}
				limit={search().limit}
				page={search().page}
				totalPages={totalPages()}
				onPageChange={setPage}
			/>
		</ExplorePageLayout>
	)
}
