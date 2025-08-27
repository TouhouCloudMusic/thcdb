import type { ComponentProps, JSX } from "solid-js"
import { mergeProps } from "solid-js"
import { twMerge } from "tailwind-merge"

import { tw } from "~/utils"

export const INPUT_BASE_CLASSNAME = tw(`
		text-slate-900 focus:text-primary
		bg-primary
		border border-slate-300

		disabled:bg-slate-50

		rounded-sm

		outline-[1.5px]
		not-disabled:hover:outline-reimu-500
		focus:outline-reimu-600

		outline-transparent -outline-offset-1
		aria-invalid:border-reimu-600

		transition-all duration-100
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
