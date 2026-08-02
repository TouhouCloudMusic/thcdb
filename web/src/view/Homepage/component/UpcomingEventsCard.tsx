import { useLingui } from "@lingui/solid/macro"
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

const MAX_VISIBLE_EVENTS = 6
const UPCOMING_EVENTS_QUERY_LIMIT = 20
const UPCOMING_EVENTS_LIST_CLASS = "divide-y divide-slate-300"

type EventRowProps = {
	event: Event
}

function EventRow(props: EventRowProps) {
	const { t } = useLingui()

	return (
		<li class="py-3 first:pt-0 last:pb-0">
			<div class="flex min-w-0 items-baseline justify-between gap-3">
				<Link
					to="/event/$id"
					params={{ id: props.event.id.toString() }}
					class="min-w-0 truncate text-base font-light tracking-normal text-primary"
				>
					{props.event.name}
				</Link>
				<Show when={displayEventDate(props.event)}>
					{(date) => (
						<span class="shrink-0 text-xs font-light tabular-nums text-tertiary">
							{date()}
						</span>
					)}
				</Show>
			</div>
			<div class="mt-1 truncate text-sm font-light text-tertiary">
				{formatEventLocation(props.event) ?? t`Unknown location`}
			</div>
		</li>
	)
}

function EventRowSkeleton() {
	return (
		<li class="py-3 first:pt-0 last:pb-0 animate-pulse motion-reduce:animate-none">
			<div class="flex items-center justify-between gap-3">
				<div class="h-4 w-2/3 rounded bg-slate-200"></div>
				<div class="h-3 w-16 rounded bg-slate-100"></div>
			</div>
			<div class="mt-1.5 h-3.5 w-1/2 rounded bg-slate-100"></div>
		</li>
	)
}

export function UpcomingEventsCard() {
	const { t } = useLingui()
	return (
		<Card class="p-0 shadow-none">
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
		<ul class={UPCOMING_EVENTS_LIST_CLASS}>
			<For each={Array.from({ length: MAX_VISIBLE_EVENTS })}>
				{() => <EventRowSkeleton />}
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

	return (
		<Show
			when={events().length > 0}
			fallback={<HomeEmptySlot class="h-44" />}
		>
			<ul class={UPCOMING_EVENTS_LIST_CLASS}>
				<For each={events()}>{(event) => <EventRow event={event} />}</For>
			</ul>
		</Show>
	)
}
