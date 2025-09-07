import { mergeProps } from "solid-js"
import type { ComponentProps, ParentProps } from "solid-js"
import { twMerge } from "tailwind-merge"

import { tw } from "~/utils"

export function PageLayout(props: ParentProps<ComponentProps<"div">>) {
	const CLASS = tw(`
    bg-primary
    h-full
    max-w-6xl
	  2xl:max-w-7xl
    mx-auto
    border-x-1 border-slate-300
    `)
	let final_props = mergeProps(props, {
		get class() {
			return twMerge(CLASS, props.class)
		},
	})

	return (
		<div class="size-full bg-slate-100">
			<div {...final_props}></div>
		</div>
	)
}
