import { useInfiniteQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import type { Event } from "@thc/api"
import { type Component, For, Show } from "solid-js"

import { Link } from "~/component/atomic"
import { Input } from "~/component/atomic/Input"
import {
	OrderBySelect,
	StickyFilterBar,
} from "~/component/feature/entity_explore"
import { DateWithPrecision } from "~/domain/shared"
import { PageLayout } from "~/layout"
import { createMockPaginatedEvents } from "~/mock/event"
import { useIntersectionSentinel } from "~/utils/solid/useIntersectionSentinel"
import type { ScrollDirection } from "~/utils/solid/useScrollDirection"
import { useScrollDirection } from "~/utils/solid/useScrollDirection"

const route = getRouteApi("/event/explore")

const EventItemSkeleton: Component = () => (
	<div class="animate-pulse border-b border-slate-200 py-4">
		<div class="mb-2 h-5 w-2/3 rounded bg-slate-200" />
		<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
			<div class="h-4 w-28 rounded bg-slate-100" />
			<div class="h-4 w-40 rounded bg-slate-100" />
		</div>
		<div class="mt-2 h-4 w-3/5 rounded bg-slate-100" />
	</div>
)

type EventItemProps = {
	event: Event
}

const formatEventDateRange = (event: Event) => {
	const start = DateWithPrecision.display(event.start_date)
	const end = DateWithPrecision.display(event.end_date)

	if (start && end) return `${start} - ${end}`
	return start ?? end
}

const formatEventLocation = (event: Event) => {
	const location = event.location
	if (!location) return

	const parts: string[] = []
	if (location.country) parts.push(location.country)
	if (location.province) parts.push(location.province)
	if (location.city) parts.push(location.city)

	if (0 === parts.length) return
	return parts.join(", ")
}

const EventItem: Component<EventItemProps> = (props) => {
	const dateRange = () => formatEventDateRange(props.event)
	const location = () => formatEventLocation(props.event)
	const alternativeNameCount = () => props.event.alternative_names?.length ?? 0

	return (
		<div class="border-b border-slate-200 py-4 last:border-b-0">
			<div class="hover:bg-slate-50 -mx-2 rounded-md px-2 py-1 focus-within:ring-2 focus-within:ring-slate-200">
				<div class="min-w-0">
					<Link
						to="/event/$id"
						params={{ id: props.event.id.toString() }}
						class="block truncate text-slate-900 no-underline hover:underline"
					>
						{props.event.name ?? `Event #${props.event.id}`}
					</Link>

					<div class="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
						<Show when={dateRange()}>{(range) => <span>{range()}</span>}</Show>

						<Show when={location()}>
							{(text) => (
								<>
									<span class="text-slate-300">·</span>
									<span class="truncate">{text()}</span>
								</>
							)}
						</Show>

						<Show when={0 < alternativeNameCount()}>
							<span class="text-slate-300">·</span>
							<span>{alternativeNameCount()} AKAs</span>
						</Show>
					</div>

					<Show when={props.event.short_description}>
						{(text) => (
							<div class="mt-1 line-clamp-1 text-sm text-slate-400">
								{text()}
							</div>
						)}
					</Show>
				</div>
			</div>
		</div>
	)
}

type EventExploreFilterBarProps = {
	scrollDirection: () => ScrollDirection
	startDateFrom: string | undefined
	startDateTo: string | undefined
	orderBy: "asc" | "desc" | undefined
	onChangeStartDate: (
		key: "start_date_from" | "start_date_to",
		value: string,
	) => void
	onChangeOrderBy: (value: "asc" | "desc") => void
}

function EventExploreFilterBar(props: EventExploreFilterBarProps) {
	return (
		<StickyFilterBar scrollDirection={props.scrollDirection}>
			<div class="flex flex-wrap items-center gap-4">
				<div class="flex items-center gap-2">
					<span class="text-sm text-slate-500">From</span>
					<Input
						type="date"
						value={props.startDateFrom ?? ""}
						onChange={(e) =>
							props.onChangeStartDate("start_date_from", e.currentTarget.value)
						}
					/>
				</div>

				<div class="flex items-center gap-2">
					<span class="text-sm text-slate-500">To</span>
					<Input
						type="date"
						value={props.startDateTo ?? ""}
						onChange={(e) =>
							props.onChangeStartDate("start_date_to", e.currentTarget.value)
						}
					/>
				</div>

				<OrderBySelect
					value={props.orderBy}
					onChange={props.onChangeOrderBy}
				/>
			</div>
		</StickyFilterBar>
	)
}

type EventExploreListProps = {
	events: Event[]
	isLoading: boolean
	isFetchingNextPage: boolean
	hasNextPage: boolean
	limit: number
	setSentinelRef: (el: HTMLDivElement | undefined) => void
}

function EventExploreList(props: EventExploreListProps) {
	return (
		<>
			<Show when={!props.isLoading && 0 === props.events.length}>
				<div class="py-8 text-sm text-slate-400">No events</div>
			</Show>

			<div class="flex flex-col">
				<For each={props.events}>{(event) => <EventItem event={event} />}</For>
			</div>

			<div
				ref={props.setSentinelRef}
				class="h-1"
			/>

			<Show when={props.isFetchingNextPage || props.isLoading}>
				<div class="flex flex-col">
					<For each={Array.from({ length: props.limit })}>
						{() => <EventItemSkeleton />}
					</For>
				</div>
			</Show>

			<Show when={!props.hasNextPage && 0 < props.events.length}>
				<div class="flex justify-center py-4 text-sm text-slate-400">
					No more events
				</div>
			</Show>
		</>
	)
}

export const EventExplore = () => {
	const search = route.useSearch()
	const scrollDirection = useScrollDirection()

	const navigate = useNavigate({ from: "/event/explore" })

	const eventsQuery = useInfiniteQuery(() => ({
		queryKey: [
			"event::explore",
			search().start_date_from,
			search().start_date_to,
			search().order_by,
			search().limit,
		],
		queryFn: ({ pageParam }) => {
			return createMockPaginatedEvents({
				limit: search().limit,
				cursor: pageParam,
				start_date_from: search().start_date_from,
				start_date_to: search().start_date_to,
				sort_direction: search().order_by,
			})
		},
		initialPageParam: 0,
		getNextPageParam: (lastPage) => lastPage.next_cursor,
	}))

	const events = () => eventsQuery.data?.pages.flatMap((p) => p.items) ?? []

	const setSentinelRef = useIntersectionSentinel<HTMLDivElement>({
		enabled: () => eventsQuery.hasNextPage && !eventsQuery.isFetchingNextPage,
		onIntersect: () => {
			void eventsQuery.fetchNextPage()
		},
	})

	const updateOrderBy = (value: "asc" | "desc" | undefined) => {
		navigate({
			to: "/event/explore",
			search: {
				...search(),
				order_by: value,
			},
		})
	}

	const setOrderBy = (value: "asc" | "desc") => {
		updateOrderBy(value)
	}

	const updateStartDate = (
		key: "start_date_from" | "start_date_to",
		value: string,
	) => {
		const nextValue = 0 < value.length ? value : undefined

		navigate({
			to: "/event/explore",
			search: {
				...search(),
				[key]: nextValue,
			},
		})
	}

	return (
		<PageLayout class="p-8">
			<div class="flex flex-col gap-6">
				<h1 class="text-2xl font-light tracking-tighter text-slate-900">
					Explore Events
				</h1>

				<EventExploreFilterBar
					scrollDirection={scrollDirection}
					startDateFrom={search().start_date_from}
					startDateTo={search().start_date_to}
					orderBy={search().order_by}
					onChangeStartDate={updateStartDate}
					onChangeOrderBy={setOrderBy}
				/>

				<EventExploreList
					events={events()}
					isLoading={eventsQuery.isLoading}
					isFetchingNextPage={eventsQuery.isFetchingNextPage}
					hasNextPage={eventsQuery.hasNextPage}
					limit={search().limit}
					setSentinelRef={setSentinelRef}
				/>
			</div>
		</PageLayout>
	)
}
