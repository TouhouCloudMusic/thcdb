import * as stylex from "@stylexjs/stylex"

import { palette } from "~/style/color/palette.stylex"

export const buttonVars = stylex.defineVars({
	solidFocusRing: palette.slate[600],
	solidBackground: palette.slate[900],
	solidBackgroundHover: palette.slate[900],
	solidBackgroundActive: palette.slate[800],
	focusRing: palette.slate[500],
	softBackgroundHover: palette.slate[200],
	softBackgroundActive: palette.slate[300],
	softBackgroundDarkHover: `color-mix(in oklab, ${palette.slate[100]} 90%, transparent)`,
	softBackgroundDarkActive: `color-mix(in oklab, ${palette.slate[100]} 80%, transparent)`,
	softText: palette.slate[700],
	ghostText: palette.slate[800],
	ghostBackgroundDisabled: palette.slate[300],
	surfaceBackground: palette.slate[100],
	surfaceBackgroundHover: palette.slate[200],
	surfaceBackgroundActive: palette.slate[300],
	border: palette.slate[400],
	surfaceText: palette.slate[700],
	outlineBackgroundActive: palette.slate[100],
	borderHover: palette.slate[500],
	outlineText: palette.slate[600],
})
