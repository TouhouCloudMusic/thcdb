import { mergeProps } from "solid-js"
import type { ComponentProps, ParentProps } from "solid-js"
import { twMerge } from "tailwind-merge"

import { tw } from "~/utils"

const CLASS = tw(`
    bg-primary
    h-full
    [--page-width:var(--container-6xl)]
    2xl:[--page-width:var(--container-7xl)]
    max-w-(--page-width)
    mx-auto
    border-slate-300
    border-x-[clamp(0px,100cqw_-_var(--page-width),1px)]
    `)

export function PageLayout(props: ParentProps<ComponentProps<"div">>) {
	const final_props = mergeProps(props, {
		get class() {
			return twMerge(CLASS, props.class)
		},
	})

	return (
		<div class="@container size-full bg-slate-100">
			<div {...final_props}></div>
		</div>
	)
}
