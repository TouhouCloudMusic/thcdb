import { useLingui } from "@lingui/solid/macro"
import { Show } from "solid-js"

import { Link } from "~/component/atomic"
import { DateWithPrecision } from "~/domain/shared"
import type { EventListItem } from "~/hey-api"

export function EventItem(props: { event: EventListItem }) {
	const { t } = useLingui()
	const dateRange = () => {
		const start = DateWithPrecision.display(props.event.start_date)
		const end = DateWithPrecision.display(props.event.end_date)
		if (start && end && start !== end) return `${start} - ${end}`
		return start ?? end
	}
	const location = () => {
		const value = [
			props.event.location.city,
			props.event.location.province,
			props.event.location.country,
		]
			.filter(Boolean)
			.join(", ")
		return value.length > 0 ? value : undefined
	}

	return (
		<div>
			<Link
				to="/event/$id"
				params={{ id: props.event.id.toString() }}
				class="wrap-break-word text-base no-underline"
			>
				{props.event.name}
			</Link>

			<div class="mt-1 font-sans text-sm text-tertiary">
				<span>{dateRange() ?? t`Unknown event date`}</span>
				<span aria-hidden="true"> · </span>
				<span>{location() ?? t`Unknown location`}</span>
			</div>

			<Show when={props.event.short_description}>
				{(description) => (
					<p class="mt-1 wrap-break-word text-sm text-tertiary">
						{description()}
					</p>
				)}
			</Show>
		</div>
	)
}
