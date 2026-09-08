import * as stylex from "@stylexjs/stylex"

import { palette } from "~/style/color/palette.stylex"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"

export const surfaceStyles = stylex.create({
	card: {
		borderRadius: radius.sm,
		boxShadow:
			"0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
		padding: px[16],
		backgroundColor: colors.backgroundPrimary,
	},
})

export const dividerStyles = stylex.create({
	horizontal: {
		display: "block",
		backgroundColor: palette.slate[300],
		height: "0.5px",
		width: "100%",
	},
	vertical: {
		display: "block",
		backgroundColor: palette.slate[300],
		width: "0.5px",
		height: "100%",
	},
})

export const formStyles = stylex.create({
	root: {
		width: "100%",
		backgroundColor: colors.backgroundPrimary,
	},
	label: {
		fontWeight: 300,
		fontSize: fontSizes.lg,
		lineHeight: lineHeights.lg,
		marginBottom: px[8],
		display: "block",
	},
})

export const infoStyles = stylex.create({
	label: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
		letterSpacing: "0.025em",
	},
	detail: {
		color: colors.textPrimary,
	},
})
