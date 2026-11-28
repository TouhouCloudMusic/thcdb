import * as stylex from "@stylexjs/stylex"

import { px } from "~/style/tokens.stylex"

import { controlLayoutVars } from "./controlSpacing.stylex"

const hasContainerHeight = "@container (block-size > 0px)"
const supportsFontMetricUnits = "@supports (padding-inline: calc(1lh - 1cap))"
const defaultGap = px[8]
const fallbackLineHeight = "1.5em"
const fallbackCapHeight = "1em"
const fallbackCapInset = `(${fallbackLineHeight} - ${fallbackCapHeight}) / 2`
const capInset = "(1lh - 1cap) / 2"
const innerHeight = `(${controlLayoutVars.targetHeight} - 2 * ${controlLayoutVars.borderWidth})`
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
export const controlSizeStyles = stylex.create({
	inferredHeight: {
		[controlLayoutVars.targetHeight]: {
			default: controlLayoutVars.presetHeight,
			[hasContainerHeight]: "100cqb",
		},
	},
	targetHeight: (height: string) => ({
		[controlLayoutVars.targetHeight]: height,
	}),
	spacing: {
		minHeight: controlLayoutVars.targetHeight,
		paddingBlock: blockSpacing,
		paddingInline: inlineSpacing,
		gap: inlineSpacing,
	},
	containerSpacing: {
		minHeight: {
			default: null,
			[hasContainerHeight]: controlLayoutVars.targetHeight,
		},
		paddingBlock: { default: null, [hasContainerHeight]: blockSpacing },
		paddingInline: { default: null, [hasContainerHeight]: inlineSpacing },
		gap: { default: defaultGap, [hasContainerHeight]: inlineSpacing },
	},
})

const iconSlotSize = {
	default: fallbackLineHeight,
	[supportsFontMetricUnits]: "1lh",
} as const
export const controlIconStyles = stylex.create({
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
