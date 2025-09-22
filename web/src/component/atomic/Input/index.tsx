import type { ComponentProps, JSX } from "solid-js"
import { mergeProps } from "solid-js"
import { twMerge } from "tailwind-merge"

import { tw } from "~/utils"

// TODO: border color
export const INPUT_LIKE_BASE_CLASS = tw(`
	bg-primary

	rounded

	border border-slate-300
	aria-invalid:border-reimu-600

	disabled:bg-slate-100

	outline-1 outline-transparent -outline-offset-1
	focus:outline-reimu-600
	not-disabled:hover:outline-reimu-500

	transition-all duration-100
	`)

export const INPUT_BASE_CLASSNAME = tw(`
		${INPUT_LIKE_BASE_CLASS}

	`)

export const INPUT_CLASSNAME = twMerge(INPUT_BASE_CLASSNAME, `pl-2 h-8`)

export function Input(props: ComponentProps<"input">): JSX.Element {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(INPUT_CLASSNAME, props.class)
		},
	})
	return <input {...finalProps} />
}
