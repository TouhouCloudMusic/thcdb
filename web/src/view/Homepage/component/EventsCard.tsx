import { useLingui } from "@lingui/solid/macro"
import type { Event } from "@thc/api"
import { For, Show } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { ExploreSection } from "~/view/Homepage/component/ExploreSection"
import { HomeEmptySlot } from "~/view/Homepage/component/HomeEmptySlot"
import { EVENTS_LIMIT } from "~/view/Homepage/constants"
import { displayEventDate, formatEventLocation } from "~/view/Homepage/utils"

const EVENTS_LIST_CLASS = "divide-y divide-slate-300"

function EventRow(props: { event: Event }) {
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

function EventsListSkeleton() {
	return (
		<ul class={EVENTS_LIST_CLASS}>
			<For each={Array.from({ length: EVENTS_LIMIT })}>
				{() => <EventRowSkeleton />}
			</For>
		</ul>
	)
}

function EventsList(props: { events: Event[] }) {
	return (
		<Show
			when={props.events.length > 0}
			fallback={<HomeEmptySlot class="h-44" />}
		>
			<ul class={EVENTS_LIST_CLASS}>
				<For each={props.events}>{(event) => <EventRow event={event} />}</For>
			</ul>
		</Show>
	)
}

export function EventsCardSkeleton() {
	const { t } = useLingui()
	return (
		<Card class="p-0 shadow-none">
			<ExploreSection
				title={t`Upcoming Events`}
				to="/event/explore"
			>
				<EventsListSkeleton />
			</ExploreSection>
		</Card>
	)
}

export function EventsCard(props: { events: Event[] }) {
	const { t } = useLingui()
	return (
		<Card class="p-0 shadow-none">
			<ExploreSection
				title={t`Upcoming Events`}
				to="/event/explore"
			>
				<EventsList events={props.events} />
			</ExploreSection>
		</Card>
	)
}
