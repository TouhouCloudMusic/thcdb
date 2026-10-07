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

export { Root, Content } from "@kobalte/core/tabs"

type IndicatorPosition = "bottom" | "top" | "left" | "right"

const scrollAreaStyles = stylex.create({
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
})

export function ScrollArea(props: ParentProps<{ styles?: StyleXStyles }>) {
	let viewport!: HTMLDivElement
	let content!: HTMLDivElement
	const focusedTabScroll = createHorizontalFocusScroll(() => viewport)
	const { canScrollLeft, canScrollRight } = createScrollEdges(
		() => viewport,
		() => content,
	)

	return (
		<div {...stylex.attrs(scrollAreaStyles.area, props.styles)}>
			<div
				ref={(element) => {
					viewport = element
				}}
				{...stylex.attrs(scrollAreaStyles.viewport)}
				onWheel={focusedTabScroll.cancel}
				onFocusIn={focusedTabScroll.reveal}
				onPointerDown={focusedTabScroll.cancel}
			>
				<div
					ref={(element) => {
						content = element
					}}
					{...stylex.attrs(scrollAreaStyles.scrollContent)}
				>
					{props.children}
				</div>
			</div>
			<div
				aria-hidden="true"
				{...stylex.attrs(scrollAreaStyles.edge, scrollAreaStyles.leftEdge)}
				style={{
					opacity: canScrollLeft() ? 1 : 0,
				}}
			>
				<div
					{...stylex.attrs(
						scrollAreaStyles.shadow,
						scrollAreaStyles.leftShadow,
					)}
				></div>
			</div>
			<div
				aria-hidden="true"
				{...stylex.attrs(scrollAreaStyles.edge, scrollAreaStyles.rightEdge)}
				style={{
					opacity: canScrollRight() ? 1 : 0,
				}}
			>
				<div
					{...stylex.attrs(
						scrollAreaStyles.shadow,
						scrollAreaStyles.rightShadow,
					)}
				></div>
			</div>
		</div>
	)
}

const listStyles = stylex.create({
	container: {
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: palette.slate[300],
	},
	list: { position: "relative", display: "flex" },
	horizontal: { columnGap: 0, whiteSpace: "nowrap" },
	vertical: { flexDirection: "column" },
})

export const containerStyles = listStyles.container

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
				listStyles.list,
				tabs.orientation() === "horizontal"
					? listStyles.horizontal
					: listStyles.vertical,
				local.styles,
			)}
		/>
	)
}

const triggerStyles = stylex.create({
	trigger: {
		display: "flex",
		height: px[32],
		alignItems: "center",
		justifyContent: "center",
		paddingInline: px[12],
		paddingBlock: 0,
		borderRadius: 0,
		fontSize: fontSizes.base,
		lineHeight: px[20],
		fontWeight: 300,
		letterSpacing: "-0.025em",
		color: {
			default: colors.textTertiary,
			":hover": { default: null, "@media (hover: hover)": colors.textPrimary },
			":is([data-selected])": colors.textPrimary,
		},
		textTransform: "none",
		transitionProperty: "all",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	horizontalChild: { flexShrink: 0 },
})

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
				triggerStyles.trigger,
				K_Tab.useTabsContext().orientation() === "horizontal"
					&& triggerStyles.horizontalChild,
				local.styles,
			)}
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

const indicatorStyles = stylex.create({
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
				indicatorStyles.indicator,
				position() === "bottom" && indicatorStyles.bottom,
				position() === "top" && indicatorStyles.top,
				position() === "left" && indicatorStyles.left,
				position() === "right" && indicatorStyles.right,
				local.styles,
			)}
		/>
	)
}
