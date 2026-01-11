import { createEffect, createSignal, onCleanup } from "solid-js"

/**
 *
 * @returns [...[signal], ref]
 * ### signal
 * a signal of bool
 * ### ref
 *  * the setter of the element
 */
export function createClickOutside() {
	const [show, setShow] = createSignal(false)

	const [ref, setRef] = createSignal<HTMLElement | undefined>()

	const callback = (event: MouseEvent) => {
		if (event.type == "mouseup") return
		const isInside = ref() ? event.composedPath().includes(ref()!) : false
		if (!isInside) {
			setShow(false)
		}
	}

	createEffect(() => {
		if (show()) {
			document.addEventListener("click", callback)
		} else {
			document.removeEventListener("click", callback)
		}
		onCleanup(() => {
			document.removeEventListener("click", callback)
		})
	})

	return [show, setShow, setRef] as const
}
