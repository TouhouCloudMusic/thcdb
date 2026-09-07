import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { ParentProps } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { colors, px } from "~/style/tokens.stylex"
import type { ScrollDirection } from "~/utils/solid/useScrollDirection"

const styles = stylex.create({
	root: {
		position: "sticky",
		top: 0,
		zIndex: 10,
		marginInline: { default: "-1rem", "@media (min-width: 40rem)": "-2rem" },
		borderBottomWidth: 1,
		borderBottomStyle: "solid",
		borderColor: palette.slate[200],
		backgroundColor: colors.backgroundPrimary,
		paddingInline: { default: px[16], "@media (min-width: 40rem)": px[32] },
		paddingBlock: px[16],
		translate: "0 0",
		transitionProperty: {
			default: null,
			"@media (prefers-reduced-motion: no-preference)":
				"transform, translate, scale, rotate",
		},
		transitionDuration: {
			default: null,
			"@media (prefers-reduced-motion: no-preference)": "200ms",
		},
		transitionTimingFunction: {
			default: null,
			"@media (prefers-reduced-motion: no-preference)":
				"cubic-bezier(0.4, 0, 0.2, 1)",
		},
	},
	hidden: { translate: "0 -100%" },
})
export function StickyFilterBar(
	props: ParentProps<{
		scrollDirection: () => ScrollDirection
		styles?: StyleXStyles
	}>,
) {
	return (
		<div
			{...stylex.attrs(
				styles.root,
				props.scrollDirection() === "down" && styles.hidden,
				props.styles,
			)}
		>
			{props.children}
		</div>
	)
}
