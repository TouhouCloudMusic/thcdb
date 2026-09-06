import { useLingui } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { Show } from "solid-js"
import type { Component } from "solid-js"

import { Pagination } from "~/component/Pagination"
import { Divider } from "~/component/atomic/Divider"
import { Input } from "~/component/atomic/Input"
import { Intersperse } from "~/component/data/Intersperse"
import {
	EmptyExplorePlaceholder,
	ExploreFilterBar,
	ExploreFilterField,
	ExplorePageLayout,
	OrderBySelect,
} from "~/component/feature/entity_explore"
import type { EventListItem } from "~/hey-api"
import { exploreEventOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { EventItem } from "~/view/event/EventItem"

const route = getRouteApi("/event/explore")

const EventItemSkeleton: Component = () => (
	<div class="animate-pulse">
		<div class="mb-2 h-5 w-2/3 rounded bg-slate-200"></div>
		<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
			<div class="h-4 w-28 rounded bg-slate-100"></div>
			<div class="h-4 w-40 rounded bg-slate-100"></div>
		</div>
		<div class="mt-2 h-4 w-3/5 rounded bg-slate-100"></div>
	</div>
)

type EventExploreFilterBarProps = {
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
	const { t } = useLingui()
	return (
		<ExploreFilterBar>
			<ExploreFilterField label={t`From`}>
				<Input
					class="h-10 w-full"
					type="date"
					value={props.startDateFrom ?? ""}
					onChange={(e) =>
						props.onChangeStartDate("start_date_from", e.currentTarget.value)
					}
				/>
			</ExploreFilterField>

			<ExploreFilterField label={t`To`}>
				<Input
					class="h-10 w-full"
					type="date"
					value={props.startDateTo ?? ""}
					onChange={(e) =>
						props.onChangeStartDate("start_date_to", e.currentTarget.value)
					}
				/>
			</ExploreFilterField>

			<OrderBySelect
				value={props.orderBy}
				onChange={props.onChangeOrderBy}
			/>
		</ExploreFilterBar>
	)
}

type EventExploreListProps = {
	events: EventListItem[]
	isLoading: boolean
	isFetching: boolean
	limit: number
	page: number
	totalPages: number
	onPageChange: (page: number) => void
}

function EventExploreList(props: EventExploreListProps) {
	const { t } = useLingui()
	return (
		<>
			<Show when={!props.isLoading && props.events.length === 0}>
				<EmptyExplorePlaceholder
					title={t`No events found`}
					action={{ to: "/event/new" }}
				/>
			</Show>

			<Show
				when={props.events.length > 0 || props.isFetching || props.isLoading}
			>
				<div class="flex flex-col gap-2 p-4">
					<Intersperse
						of={props.events}
						with={<Divider horizontal />}
					>
						{(event) => <EventItem event={event} />}
					</Intersperse>
					<Show when={props.isFetching || props.isLoading}>
						<Show when={props.events.length > 0}>
							<Divider horizontal />
						</Show>
						<Intersperse
							of={Array.from({ length: props.limit })}
							with={<Divider horizontal />}
						>
							{() => <EventItemSkeleton />}
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

export const EventExplore = () => {
	const { t } = useLingui()
	const search = route.useSearch()

	const navigate = useNavigate({ from: "/event/explore" })

	const eventsQuery = useQuery(() => {
		const snapshot = search()
		return exploreEventOptions({
			query: {
				limit: snapshot.limit,
				page: snapshot.page,
				start_date_from: snapshot.start_date_from,
				start_date_to: snapshot.start_date_to,
				sort_direction: snapshot.order_by,
			},
		})
	})

	const events = () => eventsQuery.data?.data.items ?? []
	const totalPages = () => eventsQuery.data?.data.total_pages ?? 0

	const setPage = (page: number) => {
		void navigate({
			to: "/event/explore",
			search: { ...search(), page },
		})
	}

	const updateOrderBy = (value: "asc" | "desc" | undefined) => {
		void navigate({
			to: "/event/explore",
			search: {
				...search(),
				order_by: value,
				page: 1,
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
		const nextValue = value.length > 0 ? value : undefined

		void navigate({
			to: "/event/explore",
			search: {
				...search(),
				[key]: nextValue,
				page: 1,
			},
		})
	}

	return (
		<ExplorePageLayout
			title={t`Explore Events`}
			action={{ to: "/event/new", label: t`Create event` }}
		>
			<EventExploreFilterBar
				startDateFrom={search().start_date_from}
				startDateTo={search().start_date_to}
				orderBy={search().order_by}
				onChangeStartDate={updateStartDate}
				onChangeOrderBy={setOrderBy}
			/>

			<EventExploreList
				events={events()}
				isLoading={eventsQuery.isLoading}
				isFetching={eventsQuery.isFetching}
				limit={search().limit}
				page={search().page}
				totalPages={totalPages()}
				onPageChange={setPage}
			/>
		</ExplorePageLayout>
	)
}
