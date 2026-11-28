import * as stylex from "@stylexjs/stylex"

import { palette } from "~/style/color/palette.stylex"

export const buttonVars = stylex.defineVars({
	solidFocusRing: palette.slate[600],
	solidBackground: palette.slate[900],
	solidBackgroundHover: palette.slate[900],
	solidBackgroundActive: palette.slate[800],
	focusRing: palette.slate[500],
	ghostText: palette.slate[800],
	tint: palette.slate[100],
	tintHover: palette.slate[200],
	tintActive: palette.slate[300],
	tintText: palette.slate[700],
	border: palette.slate[400],
	borderHover: palette.slate[500],
})
