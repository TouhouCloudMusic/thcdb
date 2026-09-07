import type { PolymorphicProps } from "@kobalte/core"
import * as K_Tab from "@kobalte/core/tabs"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { ParentProps } from "solid-js"
import { createMemo, splitProps } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { radius, colors, fontSizes, px } from "~/style/tokens.stylex"
import { createHorizontalFocusScroll } from "~/utils/solid/createHorizontalFocusScroll"
import { createScrollEdges } from "~/utils/solid/createScrollEdges"

export type RootProps = PolymorphicProps<"div", K_Tab.TabsRootProps<"div">> & {
	styles?: StyleXStyles
}

const styles = stylex.create({
	container: {
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: palette.slate[300],
	},
	area: { position: "relative", minWidth: 0 },
	viewport: {
		overflowX: "auto",
		scrollBehavior: {
			default: "smooth",
			"@media (prefers-reduced-motion: reduce)": "auto",
		},
		scrollbarWidth: "none",
		display: { default: null, "::-webkit-scrollbar": "none" },
	},
	scrollContent: { width: "max-content", minWidth: "100%" },
	edge: {
		pointerEvents: "none",
		position: "absolute",
		top: 0,
		bottom: 0,
		width: px[12],
		borderColor: palette.reimu[600],
		borderStyle: "solid",
	},
	leftEdge: { left: 0, borderLeftWidth: "1px" },
	rightEdge: { right: 0, borderRightWidth: "1px" },
	shadow: {
		position: "absolute",
		inset: 0,
		maskImage: "linear-gradient(to bottom,transparent,black)",
	},
	leftShadow: { boxShadow: "inset 6px 0 12px -6px rgb(0 0 0 / 8%)" },
	rightShadow: { boxShadow: "inset -6px 0 12px -6px rgb(0 0 0 / 8%)" },
	list: { position: "relative", display: "flex" },
	horizontal: { columnGap: px[8], whiteSpace: "nowrap" },
	vertical: { flexDirection: "column" },
	trigger: {
		paddingInline: px[8],
		borderRadius: 0,
		fontSize: fontSizes.sm,
		lineHeight: "1.25rem",
		fontWeight: 300,
		letterSpacing: "0.025em",
		color: {
			default: colors.textTertiary,
			":hover": { default: null, "@media (hover: hover)": colors.textPrimary },
			":is([data-selected])": colors.textPrimary,
		},
		textTransform: "uppercase",
		transitionProperty: "all",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	horizontalChild: { flexShrink: 0 },
	indicator: {
		pointerEvents: "none",
		position: "absolute",
		borderRadius: radius.full,
		backgroundColor: palette.reimu[600],
		transitionProperty: {
			default: "all",
			':is([data-resizing="true"])': "none",
			"@media (prefers-reduced-motion: reduce)": "none",
		},
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	bottom: { bottom: "-1px", height: px[2] },
	top: { top: 0, height: px[2] },
	left: { left: 0, width: px[2] },
	right: { right: 0, width: px[2] },
})

export const containerStyles = styles.container

type IndicatorPosition = "bottom" | "top" | "left" | "right"

export function Root(props: RootProps) {
	const [local, others] = splitProps(props, ["styles"])
	return (
		<K_Tab.Root
			{...others}
			{...stylex.attrs(local.styles)}
		/>
	)
}

export function ScrollArea(props: ParentProps) {
	let viewport!: HTMLDivElement
	let content!: HTMLDivElement
	const focusedTabScroll = createHorizontalFocusScroll(() => viewport)
	const { canScrollLeft, canScrollRight } = createScrollEdges(
		() => viewport,
		() => content,
	)

	return (
		<div {...stylex.attrs(styles.area)}>
			<div
				ref={(element) => {
					viewport = element
				}}
				{...stylex.attrs(styles.viewport)}
				onWheel={focusedTabScroll.cancel}
				onFocusIn={focusedTabScroll.reveal}
				onPointerDown={focusedTabScroll.cancel}
			>
				<div
					ref={(element) => {
						content = element
					}}
					{...stylex.attrs(styles.scrollContent)}
				>
					{props.children}
				</div>
			</div>
			<div
				aria-hidden="true"
				{...stylex.attrs(styles.edge, styles.leftEdge)}
				style={{
					opacity: canScrollLeft() ? 1 : 0,
				}}
			>
				<div {...stylex.attrs(styles.shadow, styles.leftShadow)}></div>
			</div>
			<div
				aria-hidden="true"
				{...stylex.attrs(styles.edge, styles.rightEdge)}
				style={{
					opacity: canScrollRight() ? 1 : 0,
				}}
			>
				<div {...stylex.attrs(styles.shadow, styles.rightShadow)}></div>
			</div>
		</div>
	)
}

export function List(
	props: PolymorphicProps<"ul", K_Tab.TabsListProps<"ul">> & {
		styles?: StyleXStyles
	},
) {
	const tabs = K_Tab.useTabsContext()
	const [local, others] = splitProps(props, ["styles"])
	return (
		<K_Tab.List
			as="ul"
			{...others}
			{...stylex.attrs(
				styles.list,
				tabs.orientation() === "horizontal"
					? styles.horizontal
					: styles.vertical,
				local.styles,
			)}
		/>
	)
}

export function Trigger(
	props: PolymorphicProps<"button", K_Tab.TabsTriggerProps<"button">> & {
		styles?: StyleXStyles
	},
) {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<K_Tab.Trigger
			as="button"
			{...others}
			{...stylex.attrs(
				styles.trigger,
				K_Tab.useTabsContext().orientation() === "horizontal"
					&& styles.horizontalChild,
				local.styles,
			)}
		/>
	)
}

export function Content(
	props: PolymorphicProps<"div", K_Tab.TabsContentProps<"div">> & {
		styles?: StyleXStyles
	},
) {
	const [local, others] = splitProps(props, ["styles"])
	return (
		<K_Tab.Content
			{...others}
			{...stylex.attrs(local.styles)}
		/>
	)
}

export type IndicatorProps = PolymorphicProps<
	"div",
	K_Tab.TabsIndicatorProps<"div">
> & {
	styles?: StyleXStyles
	position?: IndicatorPosition
}

export function Indicator(props: IndicatorProps) {
	const tabs = K_Tab.useTabsContext()
	const [local, others] = splitProps(props, ["styles", "position"])
	const position = createMemo(
		() =>
			local.position
			?? (tabs.orientation() === "horizontal" ? "bottom" : "right"),
	)

	return (
		<K_Tab.Indicator
			{...others}
			{...stylex.attrs(
				styles.indicator,
				tabs.orientation() === "horizontal" && styles.horizontalChild,
				position() === "bottom" && styles.bottom,
				position() === "top" && styles.top,
				position() === "left" && styles.left,
				position() === "right" && styles.right,
				local.styles,
			)}
		/>
	)
}
