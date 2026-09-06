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
		props.scrollDirection() === "down" ? "-translate-y-full" : "translate-y-0"

	const wrapperClass = () =>
		twMerge(
			"sticky top-0 z-10 -mx-4 border-b border-slate-200 bg-primary px-4 py-4 motion-safe:transition-transform motion-safe:duration-200 sm:-mx-8 sm:px-8",
			translateClass(),
			props.class,
		)

	return <div class={wrapperClass()}>{props.children}</div>
}
