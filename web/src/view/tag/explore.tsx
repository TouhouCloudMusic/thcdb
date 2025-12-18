import { useInfiniteQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import type { Tag, TagType } from "@thc/api"
import { type Component, For, Show } from "solid-js"

import { Link } from "~/component/atomic"
import { Select } from "~/component/atomic/form/select"
import {
	OrderBySelect,
	StickyFilterBar,
} from "~/component/feature/entity_explore"
import { TAG_TYPES } from "~/domain/tag/constants"
import { PageLayout } from "~/layout"
import { createMockPaginatedTags } from "~/mock/tag"
import { useIntersectionSentinel } from "~/utils/solid/useIntersectionSentinel"
import type { ScrollDirection } from "~/utils/solid/useScrollDirection"
import { useScrollDirection } from "~/utils/solid/useScrollDirection"

const route = getRouteApi("/tag/explore")

const isTagType = (value: string): value is TagType => {
	return TAG_TYPES.some((t) => t === value)
}

const parseOrderBy = (value: unknown) => {
	if ("asc" === value || "desc" === value) return value
}

const TagItemSkeleton: Component = () => (
	<div class="animate-pulse border-b border-slate-200 py-3">
		<div class="mb-2 h-5 w-1/3 rounded bg-slate-200" />
		<div class="h-4 w-1/4 rounded bg-slate-100" />
	</div>
)

type TagItemProps = {
	tag: Tag
}

const TagItem: Component<TagItemProps> = (props) => {
	return (
		<div class="border-b border-slate-200 py-3 last:border-b-0">
			<Link
				to="/tag/$id"
				params={{ id: props.tag.id.toString() }}
				class="truncate text-slate-900 no-underline hover:underline"
			>
				{props.tag.name}
			</Link>
		</div>
	)
}

type TagExploreFilterBarProps = {
	scrollDirection: () => ScrollDirection
	tagType: string
	orderBy: "asc" | "desc" | undefined
	onTagTypeChange: (value: string) => void
	onOrderByChange: (value: "asc" | "desc") => void
}

function TagExploreFilterBar(props: TagExploreFilterBarProps) {
	return (
		<StickyFilterBar scrollDirection={props.scrollDirection}>
			<div class="flex items-center gap-4">
				<div class="flex items-center gap-2">
					<span class="text-sm text-slate-500">Type</span>
					<Select
						value={props.tagType}
						onChange={(e) => props.onTagTypeChange(e.currentTarget.value)}
					>
						<Select.Option value="">All</Select.Option>
						<For each={TAG_TYPES}>
							{(type) => <Select.Option value={type}>{type}</Select.Option>}
						</For>
					</Select>
				</div>

				<OrderBySelect
					value={props.orderBy}
					onChange={props.onOrderByChange}
				/>
			</div>
		</StickyFilterBar>
	)
}

type TagExploreListProps = {
	tags: Tag[]
	isLoading: boolean
	isFetchingNextPage: boolean
	hasNextPage: boolean
	limit: number
	setSentinelRef: (el: HTMLDivElement | undefined) => void
}

function TagExploreList(props: TagExploreListProps) {
	return (
		<>
			<Show when={!props.isLoading && 0 === props.tags.length}>
				<div class="py-8 text-sm text-slate-400">No tags</div>
			</Show>

			<div class="flex flex-col">
				<For each={props.tags}>{(tag) => <TagItem tag={tag} />}</For>
			</div>

			<div
				ref={props.setSentinelRef}
				class="h-1"
			/>

			<Show when={props.isFetchingNextPage || props.isLoading}>
				<div class="flex flex-col">
					<For each={Array.from({ length: props.limit })}>
						{() => <TagItemSkeleton />}
					</For>
				</div>
			</Show>

			<Show when={!props.hasNextPage && 0 < props.tags.length}>
				<div class="flex justify-center py-4 text-sm text-slate-400">
					No more tags
				</div>
			</Show>
		</>
	)
}

export const TagExplore = () => {
	const search = route.useSearch()
	const scrollDirection = useScrollDirection()

	const navigate = useNavigate({ from: "/tag/explore" })

	const tagType = () => search().tag_type?.[0]
	const orderBy = () => parseOrderBy(search().order_by)

	const tagsQuery = useInfiniteQuery(() => ({
		queryKey: ["tag::explore", search().tag_type, orderBy(), search().limit],
		queryFn: ({ pageParam }) => {
			return createMockPaginatedTags({
				limit: search().limit,
				cursor: pageParam,
				tag_type: search().tag_type,
				sort_direction: orderBy(),
			})
		},
		initialPageParam: 0,
		getNextPageParam: (lastPage) => lastPage.next_cursor,
	}))

	const tags = () => tagsQuery.data?.pages.flatMap((p) => p.items) ?? []

	const setSentinelRef = useIntersectionSentinel<HTMLDivElement>({
		enabled: () => tagsQuery.hasNextPage && !tagsQuery.isFetchingNextPage,
		onIntersect: () => {
			void tagsQuery.fetchNextPage()
		},
	})

	const updateOrderBy = (value: "asc" | "desc" | undefined) => {
		navigate({
			to: "/tag/explore",
			search: {
				...search(),
				order_by: value,
			},
		})
	}

	const setOrderBy = (value: "asc" | "desc") => {
		updateOrderBy(value)
	}

	const updateTagType = (value: string) => {
		navigate({
			to: "/tag/explore",
			search: {
				...search(),
				tag_type: isTagType(value) ? [value] : undefined,
			},
		})
	}

	return (
		<PageLayout class="p-8">
			<div class="flex flex-col gap-6">
				<h1 class="text-2xl font-light tracking-tighter text-slate-900">
					Explore Tags
				</h1>

				<TagExploreFilterBar
					scrollDirection={scrollDirection}
					tagType={tagType() ?? ""}
					orderBy={orderBy()}
					onTagTypeChange={updateTagType}
					onOrderByChange={setOrderBy}
				/>

				<TagExploreList
					tags={tags()}
					isLoading={tagsQuery.isLoading}
					isFetchingNextPage={tagsQuery.isFetchingNextPage}
					hasNextPage={tagsQuery.hasNextPage}
					limit={search().limit}
					setSentinelRef={setSentinelRef}
				/>
			</div>
		</PageLayout>
	)
}
