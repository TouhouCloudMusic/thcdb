import * as stylex from "@stylexjs/stylex"

import { colors, px } from "~/style/tokens.stylex"

export const entityInfoStyles = stylex.create({
	name: {
		display: "inline-flex",
		alignItems: "baseline",
		gap: px[8],
		color: colors.textPrimary,
	},
})
