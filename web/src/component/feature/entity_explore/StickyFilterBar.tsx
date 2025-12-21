import type { ParentProps } from "solid-js"
import { twMerge } from "tailwind-merge"

import type { ScrollDirection } from "~/utils/solid/useScrollDirection"

export function StickyFilterBar(
	props: ParentProps<{
		scrollDirection: () => ScrollDirection
		class?: string
	}>,
) {
	const translateClass = () =>
		"down" === props.scrollDirection() ? "-translate-y-full" : "translate-y-0"

	const wrapperClass = () =>
		twMerge(
			"sticky top-0 z-10 -mx-8 border-b border-slate-100 bg-white px-8 py-4 transition-transform duration-200",
			translateClass(),
			props.class,
		)

	return <div class={wrapperClass()}>{props.children}</div>
}
