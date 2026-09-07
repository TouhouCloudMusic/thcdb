import * as stylex from "@stylexjs/stylex"

import { colors } from "~/style/tokens.stylex"

export const link = stylex.create({
	base: {
		color: colors.textPrimary,
		textUnderlineOffset: "4px",
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	text: {
		textDecorationLine: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
})
