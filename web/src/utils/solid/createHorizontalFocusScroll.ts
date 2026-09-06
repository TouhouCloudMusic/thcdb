import { onCleanup } from "solid-js"

export function createHorizontalFocusScroll(viewport: () => HTMLElement) {
	let frame: number | undefined
	const cancel = () => {
		if (frame !== undefined) cancelAnimationFrame(frame)
		frame = undefined
	}
	onCleanup(cancel)

	const reveal = (event: FocusEvent) => {
		if (!(event.target instanceof Element)) return
		cancel()
		const element = viewport()
		const bounds = element.getBoundingClientRect()
		const focused = event.target.getBoundingClientRect()
		const offset =
			focused.left < bounds.left
				? focused.left - bounds.left
				: Math.max(0, focused.right - bounds.right)
		if (offset === 0) return
		const target = Math.min(
			element.scrollWidth - element.clientWidth,
			Math.max(0, element.scrollLeft + offset),
		)
		if (globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			element.scrollTo({ left: target, behavior: "instant" })
			return
		}
		const start = element.scrollLeft
		element.scrollTo({ left: start, behavior: "instant" })
		const startedAt = performance.now()
		const animate = (now: number) => {
			const progress = Math.min((now - startedAt) / 150, 1)
			element.scrollTo({
				left: start + (target - start) * (1 - (1 - progress) ** 3),
				behavior: "instant",
			})
			frame = progress < 1 ? requestAnimationFrame(animate) : undefined
		}
		frame = requestAnimationFrame(animate)
	}

	return { reveal, cancel }
}
