import type { Event } from "@thc/api"
import { Show } from "solid-js"

import { Link } from "~/component/atomic"
import { DateWithPrecision } from "~/domain/shared"

type EventItemProps = {
	event: Event
}

function formatEventDateRange(event: Event) {
	const start = DateWithPrecision.display(event.start_date)
	const end = DateWithPrecision.display(event.end_date)

	if (start && end) return `${start} - ${end}`
	return start ?? end
}

function formatEventLocation(event: Event) {
	const location = event.location
	if (!location) return

	const parts: string[] = []
	if (location.country) parts.push(location.country)
	if (location.province) parts.push(location.province)
	if (location.city) parts.push(location.city)

	if (parts.length === 0) return
	return parts.join(", ")
}

export function EventItem(props: EventItemProps) {
	const dateRange = () => formatEventDateRange(props.event)
	const location = () => formatEventLocation(props.event)

	return (
		<div class="border-b border-slate-200 py-4 last:border-b-0">
			<div class="hover:bg-slate-50 -mx-2 rounded-md px-2 py-1 focus-within:ring-2 focus-within:ring-slate-200">
				<div class="min-w-0">
					<Link
						to="/event/$id"
						params={{ id: props.event.id.toString() }}
						class="block truncate text-slate-900 no-underline hover:underline"
					>
						{props.event.name}
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
