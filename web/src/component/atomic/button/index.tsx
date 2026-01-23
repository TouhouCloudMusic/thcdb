import * as Kobalte from "@kobalte/core/button"
import { match } from "arktype"
import { mergeProps } from "solid-js"
import type { JSX } from "solid-js"
import { twMerge } from "tailwind-merge"

import type { AppColor } from "~/component"

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

export type Variant =
	| "Primary"
	| "Secondary"
	| "Tertiary"
	| "PrimaryV2"
	| "SecondaryV2"
export const Variant = {
	*iter() {
		yield "Primary" as Variant
		yield "Secondary"
		yield "Tertiary"
		yield "PrimaryV2"
		yield "SecondaryV2"
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

const BUTTON_COMMON_STYLES =
	"inline-flex items-center justify-center gap-2 rounded-sm font-medium select-none whitespace-nowrap outline-1 outline-transparent -outline-offset-1 focus:outline-reimu-600 disabled:pointer-events-none transition-colors duration-100"
const DEFAULT_COLOR: AppColor = "Gray"

const getVariantColorClass = (variant: Variant, color: AppColor) =>
	match.in<Variant>().match({
		"'PrimaryV2'": () => PrimaryV2Color[color],
		"'SecondaryV2'": () => SecondaryV2Color[color],
		"'Primary'": () => PrimaryColor[color],
		"'Tertiary'": () => TertiaryColor[color],
		default: () => SecondaryColor[color],
	})(variant)

export type ButtonClassProps = Pick<Props, "variant" | "size" | "color" | "class">

export const ButtonClass_new = (options: ButtonClassProps) => {
	const variant = options.variant ?? "Secondary"
	const size = options.size ?? (variant.endsWith("V2") ? "Md" : undefined)
	const size_class = size ? SizeClass[size] : undefined

	const color = options.color ?? DEFAULT_COLOR
	const variant_class = VariantClass[variant]
	const color_class = getVariantColorClass(variant, color)

	return twMerge(
		BUTTON_COMMON_STYLES,
		size_class,
		variant_class,
		color_class,
		"disabled:opacity-50",
		options.class,
	)
}

export function Button(props: Props) {
	const final_props: Props = mergeProps({ type: "button" as const }, props, {
		get class() {
			return ButtonClass_new({
				variant: props.variant,
				size: props.size,
				color: props.color,
				class: props.class,
			})
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
	PrimaryV2: "border shadow-xs shadow-slate-950/10",
	SecondaryV2: "border shadow-xs shadow-slate-950/5",
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
    bg-reimu-600
		hover:bg-reimu-650 active:bg-reimu-500 disabled:bg-reimu-700/500
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

const PrimaryV2Color: Record<AppColor, string> = {
	Gray:
		// @tw
		`
    bg-slate-100 hover:bg-slate-200 active:bg-slate-300
    border-slate-400 text-slate-700
    `,
	Slate:
		// @tw
		`
    bg-slate-100 hover:bg-slate-200 active:bg-slate-300
    border-slate-400 text-slate-700
    `,
	Blue:
		// @tw
		`
    bg-blue-100 hover:bg-blue-200 active:bg-blue-300
    border-blue-300 text-blue-700
    `,
	Reimu:
		// @tw
		`
    bg-reimu-100 hover:bg-reimu-200 active:bg-reimu-300
    border-reimu-300 text-reimu-700
    `,
	Marisa:
		// @tw
		`
    bg-marisa-100 hover:bg-marisa-200 active:bg-marisa-300
    border-marisa-300 text-marisa-800
    `,
	Green:
		// @tw
		`
    bg-green-100 hover:bg-green-200 active:bg-green-300
    border-green-300 text-green-800
    `,
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
		text-reimu-600 hover:text-white active:text-white
		bg-slate-100 hover:bg-reimu-600 active:bg-reimu-600
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

const SecondaryV2Color: Record<AppColor, string> = {
	Gray:
		// @tw
		`
    bg-white border-slate-400 text-slate-600
    hover:bg-slate-50 hover:border-slate-500 active:bg-slate-100
    disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400
    `,
	Slate:
		// @tw
		`
    bg-white border-slate-400 text-slate-600
    hover:bg-slate-50 hover:border-slate-500 active:bg-slate-100
    disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400
    `,
	Blue:
		// @tw
		`
    bg-white border-blue-300 text-blue-600
    hover:bg-blue-50 hover:border-blue-400 active:bg-blue-100
    disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400
    `,
	Reimu:
		// @tw
		`
    bg-white border-reimu-300 text-reimu-600
    hover:bg-reimu-50 hover:border-reimu-400 active:bg-reimu-100
    disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400
    `,
	Marisa:
		// @tw
		`
    bg-white border-marisa-300 text-marisa-600
    hover:bg-marisa-100 hover:border-marisa-400 active:bg-marisa-200
    disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400
    `,
	Green:
		// @tw
		`
    bg-white border-green-300 text-green-600
    hover:bg-green-50 hover:border-green-400 active:bg-green-100
    disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400
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
