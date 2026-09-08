import * as stylex from "@stylexjs/stylex"
import type { ParentProps } from "solid-js"

import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	root: {
		display: "grid",
		minWidth: 0,
		maxWidth: "100%",
		gap: px[8],
		contain: "layout",
	},
	label: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
})

type ExploreFilterFieldProps = ParentProps<{
	label: string
}>

export function ExploreFilterField(props: ExploreFilterFieldProps) {
	return (
		<div {...stylex.attrs(styles.root)}>
			<span {...stylex.attrs(styles.label)}>{props.label}</span>
			{props.children}
		</div>
	)
}
