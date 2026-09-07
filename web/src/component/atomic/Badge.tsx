import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { ComponentProps, ParentProps } from "solid-js"
import { Show, splitProps } from "solid-js"

import type { AppColor } from "~/component"
import { palette } from "~/style/color/palette.stylex"
import { radius, lineHeights, fontSizes, px } from "~/style/tokens.stylex"
const styles = stylex.create({
	base: {
		display: "inline-flex",
		width: "fit-content",
		alignItems: "center",
		gap: px[8],
		borderRadius: radius.full,
		paddingInline: px[8],
		paddingBlock: px[4],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
	},
	dot: {
		display: "inline-block",
		width: px[6],
		height: px[6],
		borderRadius: radius.full,
		backgroundColor: "currentColor",
		opacity: 0.7,
	},
	Reimu: {
		backgroundColor: palette.reimu[100],
		color: palette.reimu[800],
		boxShadow: `inset 0 0 0 1px ${palette.reimu[300]}`,
	},
	Marisa: {
		backgroundColor: palette.marisa[100],
		color: palette.marisa[800],
		boxShadow: `inset 0 0 0 1px ${palette.marisa[300]}`,
	},
	Blue: {
		backgroundColor: palette.blue[100],
		color: palette.blue[800],
		boxShadow: `inset 0 0 0 1px ${palette.blue[300]}`,
	},
	Green: {
		backgroundColor: palette.green[100],
		color: palette.green[800],
		boxShadow: `inset 0 0 0 1px ${palette.green[300]}`,
	},
	Gray: {
		backgroundColor: palette.slate[100],
		color: palette.slate[800],
		boxShadow: `inset 0 0 0 1px ${palette.slate[300]}`,
	},
	Slate: {
		backgroundColor: palette.slate[100],
		color: palette.slate[800],
		boxShadow: `inset 0 0 0 1px ${palette.slate[300]}`,
	},
})
type Props = ParentProps<Omit<ComponentProps<"div">, "class">> & {
	showDot?: boolean
	color?: AppColor
	styles?: StyleXStyles
}
export function Badge(props: Props) {
	const [local, rest] = splitProps(props, [
		"styles",
		"children",
		"color",
		"showDot",
	])
	return (
		<div
			{...rest}
			{...stylex.attrs(
				styles.base,
				styles[local.color ?? "Slate"],
				local.styles,
			)}
		>
			<Show when={local.showDot}>
				<span {...stylex.attrs(styles.dot)}></span>{" "}
			</Show>
			{local.children}
		</div>
	)
}
