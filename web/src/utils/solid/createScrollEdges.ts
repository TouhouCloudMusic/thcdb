import { createSignal, onCleanup, onMount } from "solid-js"

export function createScrollEdges(
	viewport: () => HTMLElement,
	content: () => HTMLElement,
) {
	const [canScrollLeft, setCanScrollLeft] = createSignal(false)
	const [canScrollRight, setCanScrollRight] = createSignal(false)

	onMount(() => {
		const element = viewport()
		const updateScrollEdges = () => {
			setCanScrollLeft(element.scrollLeft > 1)
			setCanScrollRight(
				element.scrollWidth - element.clientWidth - element.scrollLeft > 1,
			)
		}
		const observer = new ResizeObserver(updateScrollEdges)
		observer.observe(element)
		observer.observe(content())
		element.addEventListener("scroll", updateScrollEdges)
		updateScrollEdges()
		onCleanup(() => {
			observer.disconnect()
			element.removeEventListener("scroll", updateScrollEdges)
		})
	})

	return { canScrollLeft, canScrollRight }
}
