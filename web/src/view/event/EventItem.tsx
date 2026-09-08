import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { Show } from "solid-js"

import { DateWithPrecision } from "~/domain/shared"
import type { EventListItem } from "~/hey-api"
import { link } from "~/style/link"
import {
	colors,
	fonts,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"

const styles = stylex.create({
	name: {
		overflowWrap: "break-word",
		fontSize: fontSizes.base,
		lineHeight: lineHeights.base,
		textDecorationLine: {
			default: "none",
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
	details: {
		marginTop: px[4],
		fontFamily: fonts.sans,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	description: {
		marginTop: px[4],
		overflowWrap: "break-word",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
})

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
				class={stylex.attrs(link.base, link.text, styles.name).class}
			>
				{props.event.name}
			</Link>

			<div {...stylex.attrs(styles.details)}>
				<span>{dateRange() ?? t`Unknown event date`}</span>
				<span aria-hidden="true"> · </span>
				<span>{location() ?? t`Unknown location`}</span>
			</div>

			<Show when={props.event.short_description}>
				{(description) => (
					<p {...stylex.attrs(styles.description)}>{description()}</p>
				)}
			</Show>
		</div>
	)
}
