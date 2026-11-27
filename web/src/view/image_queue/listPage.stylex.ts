import * as stylex from "@stylexjs/stylex"

import { colors, fontSizes, lineHeights, px } from "~/style/tokens.stylex"

export const listPageStyles = stylex.create({
	layout: {
		display: "flex",
		flexDirection: "column",
		gap: px[16],
		paddingInline: {
			default: px[16],
			"@container (min-width: 44rem)": px[32],
		},
		paddingBlock: {
			default: px[20],
			"@container (min-width: 44rem)": px[32],
		},
	},
	title: {
		fontSize: fontSizes["2xl"],
		lineHeight: lineHeights["2xl"],
		fontWeight: 300,
		letterSpacing: "-0.025em",
		color: colors.textPrimary,
	},
})
