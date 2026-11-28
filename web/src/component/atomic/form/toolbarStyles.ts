import * as stylex from "@stylexjs/stylex"

import { palette } from "~/style/color/palette.stylex"
import {
	colors,
	controlHeights,
	fontSizes,
	lineHeights,
} from "~/style/tokens.stylex"

import { controlSizeStyles } from "../controlSpacing"
import { controlLayoutVars } from "../controlSpacing.stylex"

export const toolbarStyles = stylex.create({
	control: {
		borderColor: {
			default: palette.slate[400],
			":hover": { default: null, "@media (hover: hover)": palette.slate[500] },
			":focus-within": palette.slate[500],
		},
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		outlineStyle: "none",
		outlineOffset: 0,
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionDuration: "150ms",
	},
	field: {
		[controlLayoutVars.borderWidth]: "1px",
		height: "auto",
		borderWidth: controlLayoutVars.borderWidth,
		color: colors.textPrimary,
		fontWeight: 400,
	},
})

export const toolbarFieldStyles = [
	toolbarStyles.control,
	toolbarStyles.field,
	controlSizeStyles.spacing,
	controlSizeStyles.targetHeight(controlHeights.md),
] as const
