import * as stylex from "@stylexjs/stylex"

import { colors, fontSizes, lineHeights } from "./tokens.stylex"

export const copyStyles = stylex.create({
	sm: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
})

export const textStyles = stylex.create({
	ellipsis: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
})
