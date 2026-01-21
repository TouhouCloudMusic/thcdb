import type { Event } from "@thc/api"
import { For, Show } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { ExploreSection } from "~/view/Homepage/component/ExploreSection"
import { displayEventDate, formatEventLocation } from "~/view/Homepage/utils"

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

type UpcomingEventsCardProps = {
	events: Event[]
}

export function UpcomingEventsCard(props: UpcomingEventsCardProps) {
	return (
		<Card class="p-5 shadow-none">
			<ExploreSection
				title="Upcoming Events"
				to="/event/explore"
			>
				<ul class="flex flex-col divide-y gap-2 divide-slate-200 overflow-hidden  bg-white/60">
					<For each={props.events}>{(event) => <EventRow event={event} />}</For>
				</ul>
			</ExploreSection>
		</Card>
	)
}
