import * as stylex from "@stylexjs/stylex"

import { effects } from "./tokens.stylex"

export const fadeIn = stylex.keyframes({
	from: { opacity: 0 },
	to: { opacity: 1 },
})
export const fadeOut = stylex.keyframes({
	from: { opacity: 1 },
	to: { opacity: 0 },
})
export const blurIn = stylex.keyframes({
	from: { backdropFilter: "blur(0px)", opacity: 0 },
	to: { backdropFilter: `blur(${effects.blurInBackdropBlur})`, opacity: 1 },
})
export const blurOut = stylex.keyframes({
	from: { backdropFilter: "blur(var(--blur-out-backdrop-blur))", opacity: 1 },
	to: { backdropFilter: "blur(0px)", opacity: 0 },
})
export const scaleFadeIn = stylex.keyframes({
	from: { scale: "1.1", opacity: 0 },
	to: { scale: "1", opacity: 1 },
})
export const scaleFadeOut = stylex.keyframes({
	from: { scale: "1", opacity: 1 },
	to: { scale: "1.1", opacity: 0 },
})
export const scaleUp = stylex.keyframes({
	from: { transform: `scale(${effects.scaleUpStart})`, opacity: 0 },
	to: { transform: "scale(1)", opacity: 1 },
})
export const scaleDown = stylex.keyframes({
	from: { transform: "scale(1)", opacity: 1 },
	to: { transform: `scale(${effects.scaleUpStart})`, opacity: 0 },
})
export const fadeSwipeDownIn = stylex.keyframes({
	from: { transform: "translateY(-100%)", opacity: 0 },
	to: { transform: "translateY(0)", opacity: 1 },
})
export const fadeSwipeDownOut = stylex.keyframes({
	from: { transform: "translateY(0)", opacity: 1 },
	to: { transform: "translateY(-100%)", opacity: 0 },
})
export const fadeSwipeUpIn = stylex.keyframes({
	from: { transform: "translateY(100%)", opacity: 0 },
	to: { transform: "translateY(0)", opacity: 1 },
})
export const fadeSwipeUpOut = stylex.keyframes({
	from: { transform: "translateY(0)", opacity: 1 },
	to: { transform: "translateY(100%)", opacity: 0 },
})
export const float = stylex.keyframes({
	"0%, 100%": { transform: "translateY(0) rotate(12deg)" },
	"50%": { transform: "translateY(-10px) rotate(14deg)" },
})
export const pulseSlow = stylex.keyframes({
	"0%, 100%": { opacity: 0.1 },
	"50%": { opacity: 0.3 },
})
export const pulse = stylex.keyframes({ "50%": { opacity: 0.5 } })
export const spin = stylex.keyframes({ to: { transform: "rotate(360deg)" } })

export const animationNames = stylex.defineConsts({
	fadeIn,
	fadeOut,
	blurIn,
	blurOut,
	scaleFadeIn,
	scaleFadeOut,
	scaleUp,
	scaleDown,
	fadeSwipeDownIn,
	fadeSwipeDownOut,
	fadeSwipeUpIn,
	fadeSwipeUpOut,
	float,
	pulseSlow,
	pulse,
	spin,
})

export const animationStyles = stylex.create({
	motionSafePulse: {
		animationName: {
			default: null,
			"@media (prefers-reduced-motion: no-preference)": pulse,
		},
		animationDuration: {
			default: null,
			"@media (prefers-reduced-motion: no-preference)": "2s",
		},
		animationTimingFunction: {
			default: null,
			"@media (prefers-reduced-motion: no-preference)":
				"cubic-bezier(0.4, 0, 0.6, 1)",
		},
		animationIterationCount: {
			default: null,
			"@media (prefers-reduced-motion: no-preference)": "infinite",
		},
	},
	fadeIn: {
		animationName: fadeIn,
		animationDuration: "200ms",
		animationTimingFunction: "ease",
	},
	fadeOut: {
		animationName: fadeOut,
		animationDuration: "200ms",
		animationTimingFunction: "ease",
	},
	blurIn: {
		animationName: blurIn,
		animationDuration: "200ms",
		animationTimingFunction: "ease",
	},
	blurOut: {
		animationName: blurOut,
		animationDuration: "200ms",
		animationTimingFunction: "ease",
	},
	scaleFadeIn: {
		animationName: scaleFadeIn,
		animationDuration: "200ms",
		animationTimingFunction: "ease",
	},
	scaleFadeOut: {
		animationName: scaleFadeOut,
		animationDuration: "200ms",
		animationTimingFunction: "ease",
	},
	scaleUp: {
		animationName: scaleUp,
		animationDuration: "200ms",
		animationTimingFunction: "ease-out",
	},
	scaleDown: {
		animationName: scaleDown,
		animationDuration: "200ms",
		animationTimingFunction: "ease-in",
	},
	float: {
		animationName: float,
		animationDuration: "6s",
		animationTimingFunction: "ease-in-out",
		animationIterationCount: "infinite",
	},
	pulseSlow: {
		animationName: pulseSlow,
		animationDuration: "8s",
		animationTimingFunction: "ease-in-out",
		animationIterationCount: "infinite",
	},
	pulse: {
		animationName: pulse,
		animationDuration: "2s",
		animationTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
		animationIterationCount: "infinite",
	},
	spin: {
		animationName: spin,
		animationDuration: "1s",
		animationTimingFunction: "linear",
		animationIterationCount: "infinite",
	},
})
