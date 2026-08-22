import { createIntersectionObserver } from "@solid-primitives/intersection-observer"
import { createSignal } from "solid-js"

export function createInfiniteScroll(options: {
	rootMargin?: string
	enabled?: () => boolean
	onLoadMore: () => void
}): (target: Element | undefined) => void {
	const [target, setTarget] = createSignal<Element>()

	createIntersectionObserver(
		() => {
			const currentTarget = target()
			const enabled = options.enabled?.() ?? true
			return currentTarget && enabled ? [currentTarget] : []
		},
		(entries) => {
			const entry = entries[0]
			if (!entry?.isIntersecting) return

			const enabled = options.enabled?.() ?? true
			if (!enabled) return
			options.onLoadMore()
		},
		{ rootMargin: options.rootMargin ?? "400px" },
	)

	return setTarget
}
