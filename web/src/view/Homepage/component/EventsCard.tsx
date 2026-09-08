import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { Event } from "@thc/api"
import { For, Show } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { surfaceStyles } from "~/style/primitives"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { ExploreSection } from "~/view/Homepage/component/ExploreSection"
import { HomeEmptySlot } from "~/view/Homepage/component/HomeEmptySlot"
import { EVENTS_LIMIT } from "~/view/Homepage/constants"
import { displayEventDate, formatEventLocation } from "~/view/Homepage/utils"

import { animationNames } from "../../../style/animations.stylex"

const styles = stylex.create({
	skeleton: {
		paddingTop: { default: px[12], ":first-child": 0 },
		paddingBottom: { default: px[12], ":last-child": 0 },
		borderTopWidth: { default: null, ":not(:last-child)": 0 },
		borderBottomWidth: { default: null, ":not(:last-child)": 1 },
		borderBlockStyle: "solid",
		borderColor: palette.slate[300],
		animationName: {
			default: animationNames.pulse,
			"@media (prefers-reduced-motion: reduce)": "none",
		},
		animationDuration: "2s",
		animationTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
		animationIterationCount: "infinite",
	},
	row: {
		paddingTop: { default: px[12], ":first-child": 0 },
		paddingBottom: { default: px[12], ":last-child": 0 },
		borderTopWidth: { default: null, ":not(:last-child)": 0 },
		borderBottomWidth: { default: null, ":not(:last-child)": 1 },
		borderBlockStyle: "solid",
		borderColor: palette.slate[300],
	},
	nameSkeleton: {
		height: px[16],
		width: "calc(2/3 * 100%)",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
	empty: { height: px[176] },
	name: {
		minWidth: 0,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: fontSizes.base,
		lineHeight: 1.5,
		fontWeight: 300,
		letterSpacing: 0,
		color: colors.textPrimary,
	},
	root: { padding: 0, boxShadow: "none" },
	header: {
		display: "flex",
		minWidth: 0,
		alignItems: "baseline",
		justifyContent: "space-between",
		gap: px[12],
	},
	date: {
		flexShrink: 0,
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 300,
		fontVariantNumeric: "tabular-nums",
		color: colors.textTertiary,
	},
	location: {
		marginTop: px[4],
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 300,
		color: colors.textTertiary,
	},
	skeletonHeader: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[12],
	},
	dateSkeleton: {
		height: px[12],
		width: px[64],
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
	},
	locationSkeleton: {
		marginTop: px[6],
		height: px[14],
		width: "50%",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
	},
})

function EventRow(props: { event: Event }) {
	const { t } = useLingui()

	return (
		<li {...stylex.attrs(styles.row)}>
			<div {...stylex.attrs(styles.header)}>
				<Link
					to="/event/$id"
					params={{ id: props.event.id.toString() }}
					class={stylex.attrs(link.base, link.text, styles.name).class}
				>
					{props.event.name}
				</Link>
				<Show when={displayEventDate(props.event)}>
					{(date) => <span {...stylex.attrs(styles.date)}>{date()}</span>}
				</Show>
			</div>
			<div {...stylex.attrs(styles.location)}>
				{formatEventLocation(props.event) ?? t`Unknown location`}
			</div>
		</li>
	)
}

function EventRowSkeleton() {
	return (
		<li {...stylex.attrs(styles.skeleton)}>
			<div {...stylex.attrs(styles.skeletonHeader)}>
				<div {...stylex.attrs(styles.nameSkeleton)}></div>
				<div {...stylex.attrs(styles.dateSkeleton)}></div>
			</div>
			<div {...stylex.attrs(styles.locationSkeleton)}></div>
		</li>
	)
}

function EventsListSkeleton() {
	return (
		<ul>
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
			fallback={<HomeEmptySlot styles={styles.empty} />}
		>
			<ul>
				<For each={props.events}>{(event) => <EventRow event={event} />}</For>
			</ul>
		</Show>
	)
}

export function EventsCardSkeleton() {
	const { t } = useLingui()
	return (
		<div {...stylex.attrs(surfaceStyles.card, styles.root)}>
			<ExploreSection
				title={t`Upcoming Events`}
				to="/event/explore"
			>
				<EventsListSkeleton />
			</ExploreSection>
		</div>
	)
}

export function EventsCard(props: { events: Event[] }) {
	const { t } = useLingui()
	return (
		<div {...stylex.attrs(surfaceStyles.card, styles.root)}>
			<ExploreSection
				title={t`Upcoming Events`}
				to="/event/explore"
			>
				<EventsList events={props.events} />
			</ExploreSection>
		</div>
	)
}
