import { createMemo, splitProps } from "solid-js"
import type { Ref, ParentProps } from "solid-js"
import { twMerge } from "tailwind-merge"

import { Button } from "../atomic/button"
import type { Props as ButtonProps } from "../atomic/button"

export function Sidebar(
	props: ParentProps & {
		class?: string
		ref?: Ref<HTMLDivElement> | undefined
	},
) {
	return (
		<div
			ref={props.ref}
			class={twMerge(
				"ml-auto flex h-full w-60 overflow-auto border-t-1 border-t-reimu-600 bg-primary",
				props.class,
			)}
		>
			{props.children}
		</div>
	)
}

export function ListItem(props: ParentProps<ButtonProps>) {
	const CLASS = `
    flex items-center
    py-1 px-1
    font-light font-inter text-sm text-slate-700
    *:mx-1
    [&_svg]:size-4 [&_svg]:text-slate-600
  `

	let [_, other_props] = splitProps(props, ["class"])
	let tw_class = createMemo(() => twMerge(CLASS, props.class))
	return (
		<Button
			{...other_props}
			variant="Tertiary"
			class={tw_class()}
		/>
	)
}
