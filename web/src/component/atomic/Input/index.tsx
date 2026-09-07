import * as stylex from "@stylexjs/stylex"

import { palette } from "~/style/color/palette.stylex"
import { radius, colors, px } from "~/style/tokens.stylex"

// TODO: border color
export const inputStyles = stylex.create({
	like: {
		backgroundColor: {
			default: colors.backgroundPrimary,
			":disabled": palette.slate[100],
		},
		borderRadius: radius.sm,
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: {
			default: palette.slate[300],
			':is([aria-invalid="true"])': palette.reimu[600],
		},
		color: { default: null, ":disabled": palette.slate[400] },
		outlineWidth: 1,
		outlineStyle: "solid",
		outlineOffset: -1,
		outlineColor: {
			default: "transparent",
			":focus": palette.reimu[600],
			"@media (hover: hover)": {
				default: null,
				":is(:not(:disabled):hover)": palette.reimu[500],
			},
		},
		transitionProperty: "all",
		transitionDuration: "100ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	input: { paddingLeft: px[8], height: px[32] },
})
