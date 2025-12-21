import { onCleanup, onMount } from "solid-js"

type Options = {
	rootMargin?: string
	enabled?: () => boolean
	onIntersect: () => void
}

export function useIntersectionSentinel<T extends Element>(options: Options) {
	let observer: IntersectionObserver | undefined
	let target: T | undefined

	const setTarget = (el: T | undefined) => {
		if (observer && target) observer.unobserve(target)
		target = el
		if (observer && target) observer.observe(target)
	}

	onMount(() => {
		observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0]
				if (!entry?.isIntersecting) return
				if (options.enabled && !options.enabled()) return
				options.onIntersect()
			},
			{ rootMargin: options.rootMargin ?? "400px" },
		)

		if (target) observer.observe(target)

		onCleanup(() => {
			observer?.disconnect()
			observer = undefined
			target = undefined
		})
	})

	return setTarget
}
