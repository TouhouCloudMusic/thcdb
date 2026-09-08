import * as stylex from "@stylexjs/stylex"

import { slate } from "./color/palette.stylex"

export const colors = stylex.defineVars({
	textPrimary: slate[900],
	textSecondary: slate[700],
	textTertiary: slate[600],
	backgroundPrimary: "white",
	backgroundSecondary: slate[100],
	backgroundTertiary: "white",
	border: slate[400],
	icon: slate[500],
})

export const fonts = stylex.defineConsts({
	sans: '"Geist", "ui-sans-serif", "system-ui", "sans-serif", \'"Apple Color Emoji"\', \'"Segoe UI Emoji"\', \'"Segoe UI Symbol"\', \'"Noto Color Emoji"\'',
	mono: '"Geist Mono", "ui-monospace", "Menlo", "Monaco", "Consolas", "monospace"',
	code: '"Cascadia Next SC", "ui-monospace", "Menlo", "Monaco", "Consolas", "monospace"',
})

export const px = stylex.defineConsts({
	2: "0.125rem",
	4: "0.25rem",
	6: "0.375rem",
	8: "0.5rem",
	10: "0.625rem",
	12: "0.75rem",
	14: "0.875rem",
	16: "1rem",
	20: "1.25rem",
	24: "1.5rem",
	28: "1.75rem",
	32: "2rem",
	36: "2.25rem",
	40: "2.5rem",
	44: "2.75rem",
	48: "3rem",
	56: "3.5rem",
	64: "4rem",
	80: "5rem",
	96: "6rem",
	112: "7rem",
	128: "8rem",
	144: "9rem",
	160: "10rem",
	176: "11rem",
	192: "12rem",
	208: "13rem",
	224: "14rem",
	240: "15rem",
	256: "16rem",
	272: "17rem",
	288: "18rem",
	304: "19rem",
	320: "20rem",
	384: "24rem",
	400: "25rem",
	448: "28rem",
	464: "29rem",
	512: "32rem",
	640: "40rem",
	672: "42rem",
	768: "48rem",
	896: "56rem",
	1024: "64rem",
	1280: "80rem",
	1536: "96rem",
})

export const radius = stylex.defineConsts({
	xs: "0.125rem",
	sm: "0.25rem",
	md: "0.375rem",
	lg: "0.5rem",
	full: "calc(infinity * 1px)",
})

export const fontSizes = stylex.defineConsts({
	xs: "0.75rem",
	sm: "0.875rem",
	base: "1rem",
	lg: "1.125rem",
	xl: "1.25rem",
	"2xl": "1.5rem",
	"3xl": "1.875rem",
	"4xl": "2.25rem",
})

export const lineHeights = stylex.defineVars({
	xs: "calc(1 / 0.75)",
	sm: "calc(1.25 / 0.875)",
	base: "calc(1.5 / 1)",
	lg: "calc(1.75 / 1.125)",
	xl: "calc(1.75 / 1.25)",
	"2xl": "calc(2 / 1.5)",
	"3xl": "calc(2.25 / 1.875)",
	"4xl": "calc(2.5 / 2.25)",
})

export const shadows = stylex.defineConsts({
	one: "var(--shadow-1)",
	two: "var(--shadow-2)",
	three: "var(--shadow-3)",
	four: "var(--shadow-4)",
	five: "var(--shadow-5)",
	six: "var(--shadow-6)",
})

export const effects = stylex.defineConsts({
	blur2xs: "2px",
	blurInBackdropBlur: "2px",
	scaleUpStart: "0.2",
})
