import { createSignal, onCleanup, onMount } from "solid-js"

export type ScrollDirection = "up" | "down" | undefined

type Options = {
	minY?: number
}

export function useScrollDirection(options: Options = {}) {
	const minY = options.minY ?? 50
	const [direction, setDirection] = createSignal<ScrollDirection>()
	let lastScrollY = 0

	onMount(() => {
		lastScrollY = window.scrollY
		const handleScroll = () => {
			const currentY = window.scrollY
			if (currentY > lastScrollY && currentY > minY) {
				setDirection("down")
			} else if (currentY < lastScrollY) {
				setDirection("up")
			}
			lastScrollY = currentY
		}

		window.addEventListener("scroll", handleScroll, { passive: true })
		onCleanup(() => window.removeEventListener("scroll", handleScroll))
	})

	return direction
}
