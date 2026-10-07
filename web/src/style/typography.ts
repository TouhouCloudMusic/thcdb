import * as stylex from "@stylexjs/stylex"

import { colors, fonts, fontSizes, lineHeights, px } from "./tokens.stylex"

const styles = stylex.create({
	base: {
		fontFamily: fonts.sans,
		fontWeight: 300,
		letterSpacing: "-0.025em",
		color: colors.textPrimary,
	},
	xl: {
		fontSize: px[32],
		lineHeight: 1.25,
	},
	lg: {
		fontSize: px[28],
		lineHeight: px[36],
	},
	md: {
		fontSize: fontSizes["2xl"],
		lineHeight: lineHeights["2xl"],
	},
	sm: {
		fontSize: fontSizes.xl,
		lineHeight: lineHeights.xl,
	},
	xs: {
		fontSize: fontSizes.lg,
		lineHeight: lineHeights.lg,
	},
	subtle: {
		color: colors.textTertiary,
	},
})

export const heading = {
	xs: [styles.base, styles.xs],
	subtle: styles.subtle,
	sm: [styles.base, styles.sm],
	md: [styles.base, styles.md],
	lg: [styles.base, styles.lg],
	xl: [styles.base, styles.xl],
}
