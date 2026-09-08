import type { PolymorphicProps } from "@kobalte/core"
import { Button as KobalteButton } from "@kobalte/core/button"
import type { ButtonRootProps } from "@kobalte/core/button"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import { createMemo, mergeProps, splitProps } from "solid-js"

import { buttonVars } from "~/component/atomic/button/button.stylex"
import { palette } from "~/style/color/palette.stylex"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"

export const buttonStyles = stylex.create({
	gray: {
		[buttonVars.solidFocusRing]: palette.slate[600],
		[buttonVars.solidBackground]: palette.slate[900],
		[buttonVars.solidBackgroundHover]: palette.slate[900],
		[buttonVars.solidBackgroundActive]: palette.slate[800],
		[buttonVars.focusRing]: palette.slate[500],
		[buttonVars.softBackgroundHover]: palette.slate[200],
		[buttonVars.softBackgroundActive]: palette.slate[300],
		[buttonVars.softBackgroundDarkHover]: `color-mix(in oklab, ${palette.slate[100]} 90%, transparent)`,
		[buttonVars.softBackgroundDarkActive]: `color-mix(in oklab, ${palette.slate[100]} 80%, transparent)`,
		[buttonVars.softText]: palette.slate[700],
		[buttonVars.ghostText]: palette.slate[800],
		[buttonVars.ghostBackgroundDisabled]: palette.slate[300],
		[buttonVars.surfaceBackground]: palette.slate[100],
		[buttonVars.surfaceBackgroundHover]: palette.slate[200],
		[buttonVars.surfaceBackgroundActive]: palette.slate[300],
		[buttonVars.border]: palette.slate[400],
		[buttonVars.surfaceText]: palette.slate[700],
		[buttonVars.outlineBackgroundActive]: palette.slate[100],
		[buttonVars.borderHover]: palette.slate[500],
		[buttonVars.outlineText]: palette.slate[600],
	},
	slate: {
		[buttonVars.solidFocusRing]: palette.slate[500],
		[buttonVars.solidBackground]: palette.slate[700],
		[buttonVars.solidBackgroundHover]: palette.slate[600],
		[buttonVars.solidBackgroundActive]: palette.slate[500],
		[buttonVars.focusRing]: palette.slate[500],
		[buttonVars.softBackgroundHover]: palette.slate[900],
		[buttonVars.softBackgroundActive]: palette.slate[900],
		[buttonVars.softBackgroundDarkHover]: `color-mix(in oklab, ${palette.slate[900]} 90%, transparent)`,
		[buttonVars.softBackgroundDarkActive]: `color-mix(in oklab, ${palette.slate[900]} 80%, transparent)`,
		[buttonVars.softText]: palette.slate[700],
		[buttonVars.ghostText]: palette.slate[700],
		[buttonVars.ghostBackgroundDisabled]: palette.slate[200],
		[buttonVars.surfaceBackground]: palette.slate[100],
		[buttonVars.surfaceBackgroundHover]: palette.slate[200],
		[buttonVars.surfaceBackgroundActive]: palette.slate[300],
		[buttonVars.border]: palette.slate[400],
		[buttonVars.surfaceText]: palette.slate[700],
		[buttonVars.outlineBackgroundActive]: palette.slate[100],
		[buttonVars.borderHover]: palette.slate[500],
		[buttonVars.outlineText]: palette.slate[600],
	},
	blue: {
		[buttonVars.solidFocusRing]: palette.blue[500],
		[buttonVars.solidBackground]: palette.blue[700],
		[buttonVars.solidBackgroundHover]: palette.blue[600],
		[buttonVars.solidBackgroundActive]: palette.blue[500],
		[buttonVars.focusRing]: palette.blue[500],
		[buttonVars.softBackgroundHover]: palette.blue[800],
		[buttonVars.softBackgroundActive]: palette.blue[900],
		[buttonVars.softBackgroundDarkHover]: `color-mix(in oklab, ${palette.slate[100]} 90%, transparent)`,
		[buttonVars.softBackgroundDarkActive]: `color-mix(in oklab, ${palette.slate[100]} 80%, transparent)`,
		[buttonVars.softText]: palette.blue[700],
		[buttonVars.ghostText]: palette.blue[700],
		[buttonVars.ghostBackgroundDisabled]: palette.slate[300],
		[buttonVars.surfaceBackground]: palette.blue[100],
		[buttonVars.surfaceBackgroundHover]: palette.blue[200],
		[buttonVars.surfaceBackgroundActive]: palette.blue[300],
		[buttonVars.border]: palette.blue[300],
		[buttonVars.surfaceText]: palette.blue[700],
		[buttonVars.outlineBackgroundActive]: palette.blue[100],
		[buttonVars.borderHover]: palette.blue[400],
		[buttonVars.outlineText]: palette.blue[600],
	},
	reimu: {
		[buttonVars.solidFocusRing]: palette.reimu[600],
		[buttonVars.solidBackground]: palette.reimu[600],
		[buttonVars.solidBackgroundHover]: palette.reimu[650],
		[buttonVars.solidBackgroundActive]: palette.reimu[500],
		[buttonVars.focusRing]: palette.reimu[600],
		[buttonVars.softBackgroundHover]: palette.reimu[600],
		[buttonVars.softBackgroundActive]: palette.reimu[600],
		[buttonVars.softBackgroundDarkHover]: `color-mix(in oklab, ${palette.slate[100]} 90%, transparent)`,
		[buttonVars.softBackgroundDarkActive]: `color-mix(in oklab, ${palette.slate[100]} 80%, transparent)`,
		[buttonVars.softText]: palette.reimu[600],
		[buttonVars.ghostText]: palette.reimu[700],
		[buttonVars.ghostBackgroundDisabled]: palette.slate[300],
		[buttonVars.surfaceBackground]: palette.reimu[100],
		[buttonVars.surfaceBackgroundHover]: palette.reimu[200],
		[buttonVars.surfaceBackgroundActive]: palette.reimu[300],
		[buttonVars.border]: palette.reimu[300],
		[buttonVars.surfaceText]: palette.reimu[700],
		[buttonVars.outlineBackgroundActive]: palette.reimu[100],
		[buttonVars.borderHover]: palette.reimu[400],
		[buttonVars.outlineText]: palette.reimu[600],
	},
	marisa: {
		[buttonVars.solidFocusRing]: palette.marisa[500],
		[buttonVars.solidBackground]: palette.marisa[700],
		[buttonVars.solidBackgroundHover]: palette.marisa[600],
		[buttonVars.solidBackgroundActive]: palette.marisa[500],
		[buttonVars.focusRing]: palette.marisa[500],
		[buttonVars.softBackgroundHover]: palette.marisa[800],
		[buttonVars.softBackgroundActive]: palette.marisa[900],
		[buttonVars.softBackgroundDarkHover]: `color-mix(in oklab, ${palette.marisa[900]} 90%, transparent)`,
		[buttonVars.softBackgroundDarkActive]: `color-mix(in oklab, ${palette.marisa[900]} 80%, transparent)`,
		[buttonVars.softText]: palette.marisa[700],
		[buttonVars.ghostText]: palette.marisa[700],
		[buttonVars.ghostBackgroundDisabled]: palette.slate[300],
		[buttonVars.surfaceBackground]: palette.marisa[100],
		[buttonVars.surfaceBackgroundHover]: palette.marisa[200],
		[buttonVars.surfaceBackgroundActive]: palette.marisa[300],
		[buttonVars.border]: palette.marisa[300],
		[buttonVars.surfaceText]: palette.marisa[800],
		[buttonVars.outlineBackgroundActive]: palette.marisa[200],
		[buttonVars.borderHover]: palette.marisa[400],
		[buttonVars.outlineText]: palette.marisa[600],
	},
	green: {
		[buttonVars.solidFocusRing]: palette.green[500],
		[buttonVars.solidBackground]: palette.green[700],
		[buttonVars.solidBackgroundHover]: palette.green[600],
		[buttonVars.solidBackgroundActive]: palette.green[500],
		[buttonVars.focusRing]: palette.green[500],
		[buttonVars.softBackgroundHover]: palette.green[900],
		[buttonVars.softBackgroundActive]: palette.green[900],
		[buttonVars.softBackgroundDarkHover]: `color-mix(in oklab, ${palette.green[900]} 90%, transparent)`,
		[buttonVars.softBackgroundDarkActive]: `color-mix(in oklab, ${palette.green[900]} 80%, transparent)`,
		[buttonVars.softText]: palette.green[700],
		[buttonVars.ghostText]: palette.green[700],
		[buttonVars.ghostBackgroundDisabled]: palette.slate[300],
		[buttonVars.surfaceBackground]: palette.green[100],
		[buttonVars.surfaceBackgroundHover]: palette.green[200],
		[buttonVars.surfaceBackgroundActive]: palette.green[300],
		[buttonVars.border]: palette.green[300],
		[buttonVars.surfaceText]: palette.green[800],
		[buttonVars.outlineBackgroundActive]: palette.green[100],
		[buttonVars.borderHover]: palette.green[400],
		[buttonVars.outlineText]: palette.green[600],
	},
	base: {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		gap: px[8],
		borderRadius: radius.sm,
		fontWeight: 500,
		userSelect: "none",
		whiteSpace: "nowrap",
		outlineWidth: 1,
		outlineStyle: "solid",
		outlineColor: "transparent",
		outlineOffset: -1,
		pointerEvents: {
			default: null,
			":disabled": "none",
		},
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionDuration: "100ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	xs: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		paddingBlock: px[4],
		paddingInline: px[6],
	},
	sm: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		paddingBlock: px[4],
		paddingInline: px[10],
	},
	md: {
		fontSize: fontSizes.base,
		lineHeight: lineHeights.base,
		paddingBlock: px[6],
		paddingInline: px[14],
	},
	lg: {
		fontSize: fontSizes.xl,
		lineHeight: lineHeights.xl,
		paddingBlock: px[16],
		paddingInline: px[32],
	},
	solid: {
		boxShadow: {
			default: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
			":disabled": "none",
		},
		color: {
			default: colors.backgroundPrimary,
			":disabled": palette.slate[700],
			':is(:where([data-mode="dark"] *):disabled)': palette.slate[400],
		},
		outlineColor: {
			default: "transparent",
			":focus-visible": buttonVars.solidFocusRing,
		},
		backgroundColor: {
			default: buttonVars.solidBackground,
			":hover": {
				default: null,
				"@media (hover: hover)": buttonVars.solidBackgroundHover,
			},
			":active": buttonVars.solidBackgroundActive,
			":disabled": `color-mix(in oklab, ${palette.slate[200]} 70%, transparent)`,
			':is(:where([data-mode="dark"] *):disabled)': `color-mix(in oklab, ${palette.slate[800]} 60%, transparent)`,
		},
	},
	softGray: {
		boxShadow: "none",
		backgroundColor: {
			default: colors.backgroundPrimary,
			":hover": {
				default: null,
				"@media (hover: hover)": {
					default: buttonVars.softBackgroundHover,
					':is(:where([data-mode="dark"] *))':
						buttonVars.softBackgroundDarkHover,
				},
			},
			":active": buttonVars.softBackgroundActive,
			":disabled": palette.slate[400],
			':is(:where([data-mode="dark"] *):active)':
				buttonVars.softBackgroundDarkActive,
		},
		color: buttonVars.softText,
	},
	softDarkHover: {
		backgroundColor: {
			default: palette.slate[100],
			":hover": {
				default: null,
				"@media (hover: hover)": {
					default: buttonVars.softBackgroundHover,
					':is(:where([data-mode="dark"] *))':
						buttonVars.softBackgroundDarkHover,
				},
			},
			":active": buttonVars.softBackgroundActive,
			':is(:where([data-mode="dark"] *):active)':
				buttonVars.softBackgroundDarkActive,
		},
	},
	soft: {
		boxShadow: `0 1px 2px 0 ${palette.slate[100]}`,
		outlineColor: {
			default: "transparent",
			":focus-visible": buttonVars.focusRing,
		},
		backgroundColor: {
			default: palette.slate[100],
			":hover": {
				default: null,
				"@media (hover: hover)": buttonVars.softBackgroundHover,
			},
			":active": buttonVars.softBackgroundActive,
		},
		color: {
			default: buttonVars.softText,
			":hover": {
				default: null,
				"@media (hover: hover)": palette.white,
			},
			":active": palette.white,
		},
	},
	ghostGray: {
		backgroundColor: {
			default: colors.backgroundPrimary,
			":hover": {
				default: null,
				"@media (hover: hover)": palette.slate[100],
			},
			":active": palette.slate[200],
			":disabled": {
				default: colors.backgroundSecondary,
				":hover": {
					default: null,
					"@media (hover: hover)": colors.backgroundSecondary,
				},
				":active": colors.backgroundSecondary,
			},
		},
		color: {
			default: buttonVars.ghostText,
			":disabled": palette.slate[600],
		},
		boxShadow: {
			default: "none",
			":disabled": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
		},
	},
	ghost: {
		backgroundColor: {
			default: colors.backgroundPrimary,
			":hover": {
				default: null,
				"@media (hover: hover)": palette.slate[100],
			},
			":active": palette.slate[200],
			":disabled": {
				default: buttonVars.ghostBackgroundDisabled,
				":hover": {
					default: null,
					"@media (hover: hover)": colors.backgroundSecondary,
				},
				":active": colors.backgroundSecondary,
			},
		},
		outlineColor: {
			default: "transparent",
			":focus-visible": buttonVars.focusRing,
		},
		color: buttonVars.ghostText,
	},
	surface: {
		borderWidth: 1,
		borderStyle: "solid",
		boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
		outlineColor: {
			default: "transparent",
			":focus-visible": buttonVars.focusRing,
		},
		backgroundColor: {
			default: buttonVars.surfaceBackground,
			":hover": {
				default: null,
				"@media (hover: hover)": buttonVars.surfaceBackgroundHover,
			},
			":active": buttonVars.surfaceBackgroundActive,
		},
		borderColor: buttonVars.border,
		color: buttonVars.surfaceText,
	},
	outline: {
		borderWidth: 1,
		borderStyle: "solid",
		boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
		outlineColor: {
			default: "transparent",
			":focus-visible": buttonVars.focusRing,
		},
		backgroundColor: {
			default: palette.white,
			":active": buttonVars.outlineBackgroundActive,
			":disabled": palette.slate[100],
		},
		borderColor: {
			default: buttonVars.border,
			":hover": {
				default: null,
				"@media (hover: hover)": buttonVars.borderHover,
			},
			":disabled": palette.slate[200],
		},
		color: {
			default: buttonVars.outlineText,
			":disabled": palette.slate[400],
		},
	},
	outlineMarisa: {
		backgroundColor: {
			default: palette.white,
			":hover": {
				default: null,
				"@media (hover: hover)": palette.marisa[100],
			},
			":active": buttonVars.outlineBackgroundActive,
			":disabled": palette.slate[100],
		},
	},
})

export type ButtonProps = PolymorphicProps<
	"button",
	ButtonRootProps<"button"> & {
		appearance?: "solid" | "soft" | "ghost" | "surface" | "outline"
		tone?: "gray" | "slate" | "blue" | "reimu" | "marisa" | "green"
		size?: "xs" | "sm" | "md" | "lg"
		styles?: StyleXStyles
	}
>

export function Button(props: ButtonProps) {
	const merged = mergeProps(
		{ appearance: "soft", tone: "gray" } satisfies ButtonProps,
		props,
	)
	const [local, others] = splitProps(merged, [
		"appearance",
		"tone",
		"size",
		"styles",
	])
	const attrs = createMemo(() =>
		stylex.attrs(
			buttonStyles.base,
			buttonStyles[local.appearance],
			buttonStyles[local.tone],
			local.appearance === "soft"
				&& local.tone === "gray"
				&& buttonStyles.softGray,
			local.appearance === "soft"
				&& (local.tone === "slate"
					|| local.tone === "marisa"
					|| local.tone === "green")
				&& buttonStyles.softDarkHover,
			local.appearance === "ghost"
				&& local.tone === "gray"
				&& buttonStyles.ghostGray,
			local.appearance === "outline"
				&& local.tone === "marisa"
				&& buttonStyles.outlineMarisa,
			local.size && buttonStyles[local.size],
			local.styles,
		),
	)

	return (
		<KobalteButton
			{...others}
			class={attrs().class}
			style={attrs().style}
			data-style-src={attrs()["data-style-src"]}
		/>
	)
}
