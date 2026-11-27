import * as kTooltip from "@kobalte/core/tooltip"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { createSignal } from "solid-js"
import type { ParentProps } from "solid-js"

import { Image } from "~/component/image"
import { IMAGE_QUEUE_STATUS_LABELS } from "~/component/image_queue/statusLabels"
import type {
	CursorResponseUserImageQueueItem,
	ImageQueueStatus,
} from "~/hey-api"
import { animationStyles } from "~/style/animations.stylex"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	colors,
	fontSizes,
	lineHeights,
	px,
	radius,
} from "~/style/tokens.stylex"
import { formatTimestamp } from "~/utils/dateTime"

const statusStyles = stylex.create({
	trigger: {
		flex: "none",
		display: "grid",
		placeItems: "center",
		width: px[16],
		height: px[24],
		marginInline: "-4px",
		padding: 0,
		borderStyle: "none",
		backgroundColor: "transparent",
		cursor: "help",
	},
	dot: { width: px[8], height: px[8], borderRadius: radius.full },
	pending: { backgroundColor: palette.marisa[700] },
	approved: { backgroundColor: palette.green[600] },
	rejected: { backgroundColor: palette.reimu[600] },
	inactive: { backgroundColor: palette.slate[500] },
	tooltip: {
		zIndex: 30,
		paddingInline: px[8],
		paddingBlock: px[4],
		borderRadius: radius.sm,
		backgroundColor: colors.textPrimary,
		color: colors.backgroundPrimary,
		fontSize: fontSizes.xs,
	},
})

const statusColors = {
	Pending: statusStyles.pending,
	Approved: statusStyles.approved,
	Rejected: statusStyles.rejected,
	Cancelled: statusStyles.inactive,
	Reverted: statusStyles.inactive,
}

function StatusDot(props: { status: ImageQueueStatus }) {
	const { t } = useLingui()
	const label = () => t(IMAGE_QUEUE_STATUS_LABELS[props.status])
	const [open, setOpen] = createSignal(false)
	const showOnClick = () => queueMicrotask(() => setOpen(true))

	return (
		<kTooltip.Root
			placement="top"
			gutter={4}
			open={open()}
			onOpenChange={setOpen}
		>
			<kTooltip.Trigger
				aria-label={t`Status: ${label()}`}
				onClick={showOnClick}
				{...stylex.attrs(statusStyles.trigger)}
			>
				<span
					{...stylex.attrs(statusStyles.dot, statusColors[props.status])}
				></span>
			</kTooltip.Trigger>
			<kTooltip.Portal>
				<kTooltip.Content {...stylex.attrs(statusStyles.tooltip)}>
					{label()}
				</kTooltip.Content>
			</kTooltip.Portal>
		</kTooltip.Root>
	)
}

export const rowMetadataStyles = stylex.create({
	truncated: {
		minWidth: 0,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	actor: { maxWidth: "min(100%, 12rem)", fontSize: fontSizes.sm },
	eventDate: { gridColumn: "-2 / -1", justifySelf: "end" },
})

const rowStyles = stylex.create({
	row: {
		display: "grid",
		gridColumn: "1 / -1",
		gridTemplateColumns: "subgrid",
		minHeight: px[64],
		alignItems: "center",
		paddingBlock: px[6],
		borderBottomWidth: 1,
		borderBottomStyle: "solid",
		borderBottomColor: palette.slate[200],
		fontVariantNumeric: "tabular-nums",
	},
	thumb: {
		display: "grid",
		placeItems: "center",
		gridColumn: 1,
		gridRow: 1,
		width: px[48],
		height: px[48],
		borderRadius: radius.sm,
		backgroundColor: colors.backgroundSecondary,
		color: colors.textTertiary,
		overflow: "hidden",
	},
	image: {
		display: "block",
		width: "100%",
		height: "100%",
		objectFit: "contain",
	},
	body: {
		display: "grid",
		gridColumn: "2 / -1",
		gridRow: 1,
		gridTemplateColumns: "subgrid",
		rowGap: px[4],
		minHeight: px[48],
		alignContent: "space-between",
		alignItems: "baseline",
	},
	title: {
		display: "flex",
		alignItems: "center",
		gap: px[8],
		gridColumn: "1 / -1",
		gridRow: 1,
		lineHeight: lineHeights.sm,
	},
	targetType: {
		gridColumn: 1,
		gridRow: 2,
		color: colors.textTertiary,
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.sm,
	},
})

type ImageQueueRowProps = ParentProps<{
	item: Pick<
		CursorResponseUserImageQueueItem["items"][number],
		"id" | "image_url" | "status" | "target"
	>
	bodyStyles?: StyleXStyles
	titleStyles?: StyleXStyles
	targetTypeStyles?: StyleXStyles
}>

export function ImageQueueRow(props: ImageQueueRowProps) {
	const { t } = useLingui()
	const name = () => props.item.target?.name ?? `#${props.item.id}`
	const targetTypeLabel = () => {
		switch (props.item.target?.type) {
			case "artist": {
				return t`Artist image`
			}
			case "release": {
				return t`Cover`
			}
			case undefined: {
				return undefined
			}
		}
	}

	return (
		<li {...stylex.attrs(rowStyles.row)}>
			<div
				aria-hidden="true"
				{...stylex.attrs(rowStyles.thumb)}
			>
				<Image.Root
					url={props.item.image_url}
					size={6}
				>
					<Image.Fallback>{() => "—"}</Image.Fallback>
					<Image.Img
						loading="lazy"
						styles={rowStyles.image}
					/>
				</Image.Root>
			</div>
			<div {...stylex.attrs(rowStyles.body, props.bodyStyles)}>
				<div {...stylex.attrs(rowStyles.title, props.titleStyles)}>
					<StatusDot status={props.item.status} />
					<Link
						to="/image-queue/$id"
						params={{ id: props.item.id.toString() }}
						title={name()}
						class={
							stylex.attrs(
								link.base,
								link.withUnderline,
								rowMetadataStyles.truncated,
							).class
						}
					>
						{name()}
					</Link>
				</div>
				<span {...stylex.attrs(rowStyles.targetType, props.targetTypeStyles)}>
					{targetTypeLabel()}
				</span>
				{props.children}
			</div>
		</li>
	)
}

const dateStyles = stylex.create({
	label: {
		whiteSpace: "nowrap",
		color: colors.textTertiary,
		fontSize: {
			default: fontSizes.xs,
			"@container (min-width: 40rem)": fontSizes.sm,
		},
		lineHeight: lineHeights.sm,
	},
})

export function ImageQueueDate(props: {
	value: string
	styles?: StyleXStyles
}) {
	return (
		<time
			dateTime={props.value}
			{...stylex.attrs(dateStyles.label, props.styles)}
		>
			{formatTimestamp(props.value)}
		</time>
	)
}

const skeletonStyles = stylex.create({
	title: {
		gridColumn: "2 / -1",
		gridRow: 1,
		width: "min(100%, 16rem)",
		height: px[16],
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
})

export function ImageQueueListSkeleton() {
	return (
		<li
			aria-hidden="true"
			{...stylex.attrs(rowStyles.row, animationStyles.pulse)}
		>
			<div {...stylex.attrs(rowStyles.thumb)}></div>
			<div {...stylex.attrs(skeletonStyles.title)}></div>
		</li>
	)
}
