import { useLingui } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { Show } from "solid-js"

import { Pagination } from "~/component/Pagination"
import { Divider } from "~/component/atomic/Divider"
import { Select } from "~/component/atomic/form/select"
import { Intersperse } from "~/component/data/Intersperse"
import {
	CorrectionSortFieldSelect,
	EmptyExplorePlaceholder,
	ExploreFilterBar,
	ExploreFilterField,
	ExplorePageLayout,
	OrderBySelect,
} from "~/component/feature/entity_explore"
import type { SongListItem } from "~/hey-api"
import { exploreSongOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { SongItem } from "~/view/song/SongItem"

const route = getRouteApi("/song/explore")

const LANGUAGE_OPTIONS = [
	{ id: 1, label: "Japanese" },
	{ id: 2, label: "English" },
] as const

function SongItemSkeleton() {
	return (
		<div class="motion-safe:animate-pulse grid grid-cols-[3lh_minmax(0,1fr)] items-start gap-3 leading-6">
			<div class="aspect-square rounded-sm bg-secondary"></div>
			<div>
				<div class="mb-2 h-5 w-1/2 rounded bg-slate-200"></div>
				<div class="h-4 w-1/3 rounded bg-secondary"></div>
			</div>
		</div>
	)
}

type SongExploreFilterBarProps = {
	languageId: string
	sortBy: "created_at" | "updated_at" | undefined
	orderBy: "asc" | "desc" | undefined
	onLanguageChange: (value: string) => void
	onSortByChange: (value: "created_at" | "updated_at") => void
	onOrderByChange: (value: "asc" | "desc") => void
}

function SongExploreFilterBar(props: SongExploreFilterBarProps) {
	const { t } = useLingui()
	const languageOptions = () => [
		"",
		...LANGUAGE_OPTIONS.map((lang) => lang.id.toString()),
	]

	const languageLabel = (value: string) => {
		if (value === "") return t`All`
		return (
			LANGUAGE_OPTIONS.find((lang) => lang.id.toString() === value)?.label
			?? value
		)
	}

	return (
		<ExploreFilterBar>
			<ExploreFilterField label={t`Language`}>
				<Select.Root<string>
					options={languageOptions()}
					value={props.languageId}
					onChange={(value) => props.onLanguageChange(value ?? "")}
					placeholder={t`All`}
					itemComponent={(optionProps) => (
						<Select.Item item={optionProps.item}>
							{languageLabel(optionProps.item.rawValue)}
						</Select.Item>
					)}
				>
					<Select.Trigger class="h-10 w-full">
						<Select.Value<string>>
							{(state) => languageLabel(state.selectedOption())}
						</Select.Value>
						<Select.Icon />
					</Select.Trigger>
					<Select.Portal>
						<Select.Content>
							<Select.Listbox />
						</Select.Content>
					</Select.Portal>
				</Select.Root>
			</ExploreFilterField>

			<CorrectionSortFieldSelect
				value={props.sortBy}
				onChange={props.onSortByChange}
			/>

			<OrderBySelect
				value={props.orderBy}
				onChange={props.onOrderByChange}
			/>
		</ExploreFilterBar>
	)
}

type SongExploreListProps = {
	songs: SongListItem[]
	isLoading: boolean
	isFetching: boolean
	limit: number
	page: number
	totalPages: number
	onPageChange: (page: number) => void
}

function SongExploreList(props: SongExploreListProps) {
	const { t } = useLingui()
	return (
		<>
			<Show when={!props.isLoading && props.songs.length === 0}>
				<EmptyExplorePlaceholder
					title={t`No songs found`}
					action={{ to: "/song/new" }}
				/>
			</Show>

			<Show
				when={props.songs.length > 0 || props.isFetching || props.isLoading}
			>
				<div class="flex flex-col gap-2 p-4">
					<Intersperse
						of={props.songs}
						with={<Divider horizontal />}
					>
						{(song) => <SongItem song={song} />}
					</Intersperse>
					<Show when={props.isFetching || props.isLoading}>
						<Show when={props.songs.length > 0}>
							<Divider horizontal />
						</Show>
						<Intersperse
							of={Array.from({ length: props.limit })}
							with={<Divider horizontal />}
						>
							{() => <SongItemSkeleton />}
						</Intersperse>
					</Show>
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
	const { t } = useLingui()
	const search = route.useSearch()

	const navigate = useNavigate({ from: "/song/explore" })

	const songsQuery = useQuery(() => {
		const snapshot = search()
		return exploreSongOptions({
			query: {
				limit: snapshot.limit,
				page: snapshot.page,
				language_id: snapshot.language_id,
				sort_field: snapshot.sort_by,
				sort_direction: snapshot.order_by,
			},
		})
	})

	const songs = () => songsQuery.data?.data.items ?? []
	const totalPages = () => songsQuery.data?.data.total_pages ?? 0

	const setPage = (page: number) => {
		void navigate({
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
		void navigate({
			to: "/song/explore",
			search: {
				...search(),
				[key]: value ?? undefined,
				page: 1,
			},
		})
	}

	const setOrderBy = (value: "asc" | "desc") => {
		updateFilter("order_by", value)
	}

	const setSortBy = (value: "created_at" | "updated_at") => {
		updateFilter("sort_by", value)
	}

	const updateLanguageId = (value: string) => {
		const parsed = Number.parseInt(value, 10)
		void navigate({
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
			title={t`Explore Songs`}
			action={{ to: "/song/new", label: t`Create song` }}
		>
			<SongExploreFilterBar
				languageId={search().language_id?.[0]?.toString() ?? ""}
				sortBy={search().sort_by}
				orderBy={search().order_by}
				onLanguageChange={updateLanguageId}
				onSortByChange={setSortBy}
				onOrderByChange={setOrderBy}
			/>

			<SongExploreList
				songs={songs()}
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
