import type { PolymorphicProps } from "@kobalte/core"
import { Button as KobalteButton } from "@kobalte/core/button"
import type { ButtonRootProps } from "@kobalte/core/button"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import type { ParentProps } from "solid-js"
import { createMemo, mergeProps, splitProps } from "solid-js"

import {
	buttonLayoutVars,
	buttonVars,
} from "~/component/atomic/button/button.stylex"
import { palette } from "~/style/color/palette.stylex"
import {
	radius,
	colors,
	controlHeights,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"

const hasContainerHeight = "@container (block-size > 0px)"
const supportsFontMetricUnits = "@supports (padding-inline: calc(1lh - 1cap))"
const borderedWidth = "1px"
const defaultGap = px[8]
const fallbackLineHeight = "1.5em"
const fallbackCapHeight = "1em"
const fallbackCapInset = `(${fallbackLineHeight} - ${fallbackCapHeight}) / 2`
const capInset = "(1lh - 1cap) / 2"
const innerHeight = `(${buttonLayoutVars.targetHeight} - 2 * ${buttonLayoutVars.borderWidth})`
const fallbackBlockPadding = `max(0px, (${innerHeight} - ${fallbackLineHeight}) / 2)`
const blockPadding = `max(0px, (${innerHeight} - 1lh) / 2)`
const blockSpacing = {
	default: fallbackBlockPadding,
	[supportsFontMetricUnits]: blockPadding,
} as const
const inlineSpacing = {
	default: `calc(${fallbackBlockPadding} + ${fallbackCapInset})`,
	[supportsFontMetricUnits]: `calc(${blockPadding} + ${capInset})`,
} as const
const sizeStyles = stylex.create({
	inferredHeight: {
		[buttonLayoutVars.targetHeight]: {
			default: buttonLayoutVars.presetHeight,
			[hasContainerHeight]: "100cqb",
		},
	},
	targetHeight: (height: string) => ({
		[buttonLayoutVars.targetHeight]: height,
	}),
	spacing: {
		minHeight: buttonLayoutVars.targetHeight,
		paddingBlock: blockSpacing,
		paddingInline: inlineSpacing,
		gap: inlineSpacing,
	},
	containerSpacing: {
		minHeight: {
			default: null,
			[hasContainerHeight]: buttonLayoutVars.targetHeight,
		},
		paddingBlock: { default: null, [hasContainerHeight]: blockSpacing },
		paddingInline: { default: null, [hasContainerHeight]: inlineSpacing },
		gap: { default: defaultGap, [hasContainerHeight]: inlineSpacing },
	},
	xs: {
		[buttonLayoutVars.presetHeight]: controlHeights.xs,
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
	},
	sm: {
		[buttonLayoutVars.presetHeight]: controlHeights.sm,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	md: {
		[buttonLayoutVars.presetHeight]: controlHeights.md,
		fontSize: fontSizes.base,
		lineHeight: lineHeights.base,
	},
	lg: {
		[buttonLayoutVars.presetHeight]: controlHeights.lg,
		fontSize: fontSizes.xl,
		lineHeight: lineHeights.xl,
	},
})

export const buttonSizeStyles = {
	xs: [sizeStyles.spacing, sizeStyles.inferredHeight, sizeStyles.xs],
	sm: [sizeStyles.spacing, sizeStyles.inferredHeight, sizeStyles.sm],
	md: [sizeStyles.spacing, sizeStyles.inferredHeight, sizeStyles.md],
	lg: [sizeStyles.spacing, sizeStyles.inferredHeight, sizeStyles.lg],
} as const

export const buttonStyles = stylex.create({
	gray: {
		[buttonVars.solidFocusRing]: palette.slate[600],
		[buttonVars.solidBackground]: palette.slate[900],
		[buttonVars.solidBackgroundHover]: palette.slate[900],
		[buttonVars.solidBackgroundActive]: palette.slate[800],
		[buttonVars.focusRing]: palette.slate[500],
		[buttonVars.ghostText]: palette.slate[800],
		[buttonVars.tint]: palette.slate[100],
		[buttonVars.tintHover]: palette.slate[200],
		[buttonVars.tintActive]: palette.slate[300],
		[buttonVars.tintText]: palette.slate[700],
		[buttonVars.border]: palette.slate[400],
		[buttonVars.borderHover]: palette.slate[500],
	},
	slate: {
		[buttonVars.solidFocusRing]: palette.slate[500],
		[buttonVars.solidBackground]: palette.slate[700],
		[buttonVars.solidBackgroundHover]: palette.slate[600],
		[buttonVars.solidBackgroundActive]: palette.slate[500],
		[buttonVars.focusRing]: palette.slate[500],
		[buttonVars.ghostText]: palette.slate[700],
		[buttonVars.tint]: palette.slate[100],
		[buttonVars.tintHover]: palette.slate[200],
		[buttonVars.tintActive]: palette.slate[300],
		[buttonVars.tintText]: palette.slate[700],
		[buttonVars.border]: palette.slate[400],
		[buttonVars.borderHover]: palette.slate[500],
	},
	blue: {
		[buttonVars.solidFocusRing]: palette.blue[500],
		[buttonVars.solidBackground]: palette.blue[700],
		[buttonVars.solidBackgroundHover]: palette.blue[600],
		[buttonVars.solidBackgroundActive]: palette.blue[500],
		[buttonVars.focusRing]: palette.blue[500],
		[buttonVars.ghostText]: palette.blue[700],
		[buttonVars.tint]: palette.blue[100],
		[buttonVars.tintHover]: palette.blue[200],
		[buttonVars.tintActive]: palette.blue[300],
		[buttonVars.tintText]: palette.blue[700],
		[buttonVars.border]: palette.blue[300],
		[buttonVars.borderHover]: palette.blue[400],
	},
	reimu: {
		[buttonVars.solidFocusRing]: palette.reimu[600],
		[buttonVars.solidBackground]: palette.reimu[600],
		[buttonVars.solidBackgroundHover]: palette.reimu[650],
		[buttonVars.solidBackgroundActive]: palette.reimu[500],
		[buttonVars.focusRing]: palette.reimu[600],
		[buttonVars.ghostText]: palette.reimu[700],
		[buttonVars.tint]: palette.reimu[100],
		[buttonVars.tintHover]: palette.reimu[200],
		[buttonVars.tintActive]: palette.reimu[300],
		[buttonVars.tintText]: palette.reimu[700],
		[buttonVars.border]: palette.reimu[300],
		[buttonVars.borderHover]: palette.reimu[400],
	},
	marisa: {
		[buttonVars.solidFocusRing]: palette.marisa[500],
		[buttonVars.solidBackground]: palette.marisa[700],
		[buttonVars.solidBackgroundHover]: palette.marisa[600],
		[buttonVars.solidBackgroundActive]: palette.marisa[500],
		[buttonVars.focusRing]: palette.marisa[500],
		[buttonVars.ghostText]: palette.marisa[700],
		[buttonVars.tint]: palette.marisa[100],
		[buttonVars.tintHover]: palette.marisa[200],
		[buttonVars.tintActive]: palette.marisa[300],
		[buttonVars.tintText]: palette.marisa[800],
		[buttonVars.border]: palette.marisa[300],
		[buttonVars.borderHover]: palette.marisa[400],
	},
	green: {
		[buttonVars.solidFocusRing]: palette.green[500],
		[buttonVars.solidBackground]: palette.green[700],
		[buttonVars.solidBackgroundHover]: palette.green[600],
		[buttonVars.solidBackgroundActive]: palette.green[500],
		[buttonVars.focusRing]: palette.green[500],
		[buttonVars.ghostText]: palette.green[700],
		[buttonVars.tint]: palette.green[100],
		[buttonVars.tintHover]: palette.green[200],
		[buttonVars.tintActive]: palette.green[300],
		[buttonVars.tintText]: palette.green[800],
		[buttonVars.border]: palette.green[300],
		[buttonVars.borderHover]: palette.green[400],
	},
	base: {
		[buttonLayoutVars.borderWidth]: "0px",
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		gap: defaultGap,
		borderRadius: radius.sm,
		fontWeight: 500,
		userSelect: "none",
		whiteSpace: "nowrap",
		outlineWidth: 1,
		outlineStyle: "solid",
		outlineColor: {
			default: "transparent",
			":focus-visible": buttonVars.focusRing,
		},
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
	soft: {
		backgroundColor: {
			default: buttonVars.tint,
			"@media (hover: hover)": {
				default: null,
				":is(:not(:disabled):not(:active):hover)": buttonVars.tintHover,
			},
			":active": buttonVars.tintActive,
			":disabled": colors.backgroundSecondary,
		},
		color: {
			default: buttonVars.tintText,
			":disabled": palette.slate[600],
		},
	},
	ghost: {
		backgroundColor: {
			default: "transparent",
			"@media (hover: hover)": {
				default: null,
				":is(:not(:disabled):not(:active):hover)": palette.slate[100],
			},
			":active": palette.slate[200],
			":disabled": colors.backgroundSecondary,
		},
		color: {
			default: buttonVars.ghostText,
			":disabled": palette.slate[600],
		},
	},
	surface: {
		[buttonLayoutVars.borderWidth]: borderedWidth,
		borderWidth: buttonLayoutVars.borderWidth,
		borderStyle: "solid",
		boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
		backgroundColor: {
			default: buttonVars.tint,
			"@media (hover: hover)": {
				default: null,
				":is(:not(:disabled):not(:active):hover)": buttonVars.tintHover,
			},
			":active": buttonVars.tintActive,
		},
		borderColor: buttonVars.border,
		color: buttonVars.tintText,
	},
	outline: {
		[buttonLayoutVars.borderWidth]: borderedWidth,
		borderWidth: buttonLayoutVars.borderWidth,
		borderStyle: "solid",
		boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
		backgroundColor: {
			default: palette.white,
			"@media (hover: hover)": {
				default: null,
				":is(:not(:disabled):not(:active):hover)": buttonVars.tint,
			},
			":active": buttonVars.tintHover,
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
			default: buttonVars.tintText,
			":disabled": palette.slate[400],
		},
	},
})

const iconSlotSize = {
	default: fallbackLineHeight,
	[supportsFontMetricUnits]: "1lh",
} as const
const iconStyles = stylex.create({
	slot: {
		display: "grid",
		flex: "none",
		gridTemplate: "100% / 100%",
		placeItems: "center",
		inlineSize: iconSlotSize,
		blockSize: iconSlotSize,
		marginInline: {
			default: `calc(-1 * (${fallbackCapInset}))`,
			[supportsFontMetricUnits]: `calc(-1 * (${capInset}))`,
		},
	},
})

function Icon(props: ParentProps) {
	return <span {...stylex.attrs(iconStyles.slot)}>{props.children}</span>
}

export type ButtonProps = PolymorphicProps<
	"button",
	ButtonRootProps<"button"> & {
		appearance?: "solid" | "soft" | "ghost" | "surface" | "outline"
		tone?: "gray" | "slate" | "blue" | "reimu" | "marisa" | "green"
		size?: keyof typeof buttonSizeStyles
		targetHeight?: string
		styles?: StyleXStyles
	}
>

function Root(props: ButtonProps) {
	const merged = mergeProps(
		{ appearance: "soft", tone: "gray" } satisfies ButtonProps,
		props,
	)
	const [local, others] = splitProps(merged, [
		"appearance",
		"tone",
		"size",
		"targetHeight",
		"styles",
	])
	const attrs = createMemo(() => {
		const size = local.size
		const targetHeight = local.targetHeight
		return stylex.attrs(
			buttonStyles.base,
			buttonStyles[local.appearance],
			buttonStyles[local.tone],
			size && sizeStyles[size],
			size !== undefined || targetHeight !== undefined
				? sizeStyles.spacing
				: sizeStyles.containerSpacing,
			targetHeight === undefined
				? sizeStyles.inferredHeight
				: sizeStyles.targetHeight(targetHeight),
			local.styles,
		)
	})

	return (
		<KobalteButton
			{...others}
			class={attrs().class}
			style={attrs().style}
			data-style-src={attrs()["data-style-src"]}
		/>
	)
}

export const Button = /*#__PURE__*/ Object.assign(Root, { Icon })
