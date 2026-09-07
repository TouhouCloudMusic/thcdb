import * as stylex from "@stylexjs/stylex"

import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"
export const authStyles = stylex.create({
	header: { marginBottom: px[24] },
	title: {
		fontSize: fontSizes["2xl"],
		lineHeight: lineHeights["2xl"],
		fontWeight: 300,
		letterSpacing: "-.025em",
		color: colors.textPrimary,
		marginBlockEnd: { default: 0, ":not(:last-child)": px[8] },
	},
	description: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
		marginBlockEnd: { default: 0, ":not(:last-child)": px[8] },
	},
	form: { width: "100%", display: "flex", flexDirection: "column" },
	fieldLabel: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	input: { height: px[36], width: "100%" },
})
