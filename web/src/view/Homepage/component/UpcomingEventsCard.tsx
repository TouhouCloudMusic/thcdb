import { t } from "@lingui/core/macro"
import { useQuery } from "@tanstack/solid-query"
import { EventApi } from "@thc/api"
import type { Event } from "@thc/api"
import dayjs from "dayjs"
import { Either } from "effect"
import { For, Show, Suspense } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { ExploreSection } from "~/view/Homepage/component/ExploreSection"
import { HomeEmptySlot } from "~/view/Homepage/component/HomeEmptySlot"
import { displayEventDate, formatEventLocation } from "~/view/Homepage/utils"

const MAX_VISIBLE_EVENTS = 4
const UPCOMING_EVENTS_QUERY_LIMIT = 20

type EventRowProps = {
	event: Event
}

function EventRow(props: EventRowProps) {
	const dateLabel = () => displayEventDate(props.event)
	const locationLabel = () => formatEventLocation(props.event)
	const eventId = () => props.event.id.toString()

	return (
		<li class="flex flex-col first:pt-0 py-2">
			<Link
				to="/event/$id"
				params={{ id: eventId() }}
				class="block truncate font-light text-primary  hover:underline"
			>
				{props.event.name}
			</Link>
			<div class="flex justify-between align-center text-sm text-tertiary ">
				<Show when={dateLabel()}>{(date) => <span>{date()}</span>}</Show>
				<Show when={locationLabel()}>{(label) => <span>{label()}</span>}</Show>
			</div>
		</li>
	)
}

type EventRowSkeletonProps = {
	isLoading?: boolean
}

function EventRowSkeleton(props: EventRowSkeletonProps) {
	const pulse = () =>
		props.isLoading ? "animate-pulse motion-reduce:animate-none" : ""

	return (
		<li class={`flex flex-col first:pt-0 py-2 ${pulse()}`}>
			<div class="h-4 w-2/3 rounded bg-slate-200"></div>
			<div class="mt-2 flex justify-between align-center">
				<div class="h-3 w-20 rounded bg-slate-100"></div>
				<div class="h-3 w-28 rounded bg-slate-100"></div>
			</div>
		</li>
	)
}

function UpcomingEventsListEmpty() {
	return <HomeEmptySlot class="h-44" />
}

export function UpcomingEventsCard() {
	return (
		<Card class="p-5 shadow-none">
			<ExploreSection
				title={t`Upcoming Events`}
				to="/event/explore"
			>
				<Suspense fallback={<UpcomingEventsListSkeleton />}>
					<UpcomingEventsList />
				</Suspense>
			</ExploreSection>
		</Card>
	)
}

function UpcomingEventsListSkeleton() {
	return (
		<ul class="flex flex-col divide-y gap-2 divide-slate-200 overflow-hidden  bg-white/60">
			<For each={Array.from({ length: MAX_VISIBLE_EVENTS })}>
				{() => <EventRowSkeleton isLoading />}
			</For>
		</ul>
	)
}

function UpcomingEventsList() {
	const today = dayjs().format("YYYY-MM-DD")
	const upcomingEventsQuery = useQuery(() => ({
		queryKey: ["home::upcoming-events", today, MAX_VISIBLE_EVENTS],
		queryFn: async () => {
			const res = await EventApi.explore({
				query: {
					page: 1,
					limit: UPCOMING_EVENTS_QUERY_LIMIT,
					start_date_from: today,
					sort_field: "created_at",
					sort_direction: "desc",
				},
			})
			const paginated = Either.getOrThrowWith(res, (error) => {
				throw error
			})
			return paginated.items
				.filter((event) => event.start_date?.value != null)
				.sort((a, b) => a.start_date!.value.localeCompare(b.start_date!.value))
				.slice(0, MAX_VISIBLE_EVENTS)
		},
	}))

	const events = () => upcomingEventsQuery.data ?? []
	const visibleEvents = () => events().slice(0, MAX_VISIBLE_EVENTS)
	const hasEvents = () => visibleEvents().length > 0

	return (
		<Show
			when={hasEvents()}
			fallback={<UpcomingEventsListEmpty />}
		>
			<ul class="flex flex-col divide-y gap-2 divide-slate-200 overflow-hidden  bg-white/60">
				<For each={visibleEvents()}>
					{(event) => <EventRow event={event} />}
				</For>
			</ul>
		</Show>
	)
}
