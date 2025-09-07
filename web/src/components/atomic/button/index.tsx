import * as Kobalte from "@kobalte/core/button"
import { match } from "arktype"
import { mergeProps } from "solid-js"
import type { JSX } from "solid-js"
import { twMerge } from "tailwind-merge"

import type { AppColor } from "~/components"

/**
 * Note: 样式没做完
 */

export type Size = "Xs" | "Sm" | "Md" | "Lg"
export const Size = {
	*iter() {
		yield "Xs" as Size
		yield "Sm"
		yield "Md"
		yield "Lg"
	},
	default(): Size {
		return "Md"
	},
}

export type Variant = "Primary" | "Secondary" | "Tertiary"
export const Variant = {
	*iter() {
		yield "Primary" as Variant
		yield "Secondary"
		yield "Tertiary"
	},
	// TODO: remove default value
	default(): Variant {
		return "Secondary"
	},
}

export interface Props extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant
	size?: Size
	color?: AppColor
}

export function Button(props: Props) {
	// @tw
	const BUTTON_COMMON_STYLES = `rounded-sm transition-all font-medium p-1`
	const DEFAULT_COLOR: AppColor = "Gray"
	let variant_color = match.in<Variant>().match({
		"'Primary'": () => PrimaryColor[props.color ?? DEFAULT_COLOR],
		"'Tertiary'": () => TertiaryColor[props.color ?? DEFAULT_COLOR],
		default: () => SecondaryColor[props.color ?? DEFAULT_COLOR],
	})

	let final_props: Props = mergeProps({ type: "button" as const }, props, {
		get class() {
			let size_class = SizeClass[props.size ?? Size.default()]
			let variant = props.variant ?? "Secondary"

			let variant_class = VariantClass[variant]
			let color_class = variant_color(variant)

			return twMerge(
				BUTTON_COMMON_STYLES,
				size_class,
				variant_class,
				color_class,
				props.class,
			)
		},
	})

	return <Kobalte.Button {...final_props} />
}

const SizeClass = {
	// @tw
	Xs: "text-xs py-1 px-1.5",
	// @tw
	Sm: "text-sm py-1 px-2.5",
	// @tw
	Md: "text-base py-1.5 px-3.5",
	// @tw
	Lg: "text-xl py-4 px-8",
}

// @tw
const VariantClass = {
	Primary: `shadow-sm text-(--background-color-primary)`,
	Secondary: `shadow-xs shadow-slate-100`,
	// @tw
	Tertiary: `bg-primary hover:bg-slate-100 active:bg-slate-200 disabled:bg-secondary disabled:hover:bg-secondary disabled:active:bg-secondary`,
}

const PrimaryColor: Record<AppColor, string> = {
	Gray:
		// @tw
		`
    bg-slate-900 hover:bg-slate-900 active:bg-slate-800 disabled:bg-slate-800
    `,
	Slate:
		// @tw
		`
    bg-slate-700 hover:bg-slate-600 active:bg-slate-500 disabled:bg-slate-700/500
    dark:disabled:bg-slate-600
    `,
	Blue:
		// @tw
		`
    bg-blue-700 hover:bg-blue-600 active:bg-blue-500 disabled:bg-blue-700/500
    dark:disabled:bg-blue-600
    `,
	Reimu:
		// @tw
		`
    bg-reimu-700 hover:bg-reimu-600 active:bg-reimu-500 disabled:bg-blue-700/500
    dark:disabled:bg-reimu-600
    `,
	Marisa:
		// @tw
		`
    bg-marisa-700 hover:bg-marisa-600 active:bg-marisa-500 disabled:bg-marisa-700/500
    dark:disabled:bg-marisa-600
    `,
	Green:
		// @tw
		`
    bg-green-700 hover:bg-green-600 active:bg-green-500 disabled:bg-green-700/500
    dark:disabled:bg-green-600`,
}

const SecondaryColor: Record<AppColor, string> = {
	Gray:
		// @tw
		`
		bg-primary
		ring-2 ring-inset ring-slate-200
		text-slate-700	hover:bg-slate-200 active:bg-slate-300 disabled:bg-slate-400
		dark:hover:bg-slate-100/90 dark:active:bg-slate-100/80
		`,
	Blue:
		// @tw
		`
		text-blue-700 hover:text-white active:text-white
		bg-slate-100 hover:bg-blue-800 active:bg-blue-900
		`,
	Reimu:
		// @tw
		`
		text-reimu-700 hover:text-white active:text-white
		bg-slate-100 hover:bg-reimu-800 active:bg-reimu-800/80
		`,
	Marisa:
		// @tw
		`
		text-marisa-700 hover:text-white active:text-white
		bg-slate-100 hover:bg-marisa-800 active:bg-marisa-900
		dark:hover:bg-marisa-900/90 dark:active:bg-marisa-900/80
		`,
	Green:
		// @tw
		`
		text-green-700 hover:text-white active:text-white
		bg-slate-100 hover:bg-green-900 active:bg-green-900
		dark:hover:bg-green-900/90 dark:active:bg-green-900/80
		`,
	Slate:
		// @tw
		`
		text-slate-700 hover:text-white active:text-white
		bg-slate-100 hover:bg-slate-900 active:bg-slate-900
		dark:hover:bg-slate-900/90 dark:active:bg-slate-900/80
		`,
}

const TertiaryColor: Record<AppColor, string> = {
	Gray:
		// @tw
		`
      text-slate-800 disabled:text-slate-600
      disabled:shadow-xs
      `,
	Blue:
		// @tw
		`
      text-blue-700
      disabled:bg-slate-300
      `,
	Reimu:
		// @tw
		`
      text-reimu-700
      disabled:bg-slate-300
      `,
	Marisa:
		// @tw
		`
      text-marisa-700
      disabled:bg-slate-300
      `,
	Green:
		// @tw
		`
      text-green-700
      disabled:bg-slate-300
      `,
	Slate:
		// @tw
		`
      text-slate-700
      disabled:bg-slate-200
      `,
}
