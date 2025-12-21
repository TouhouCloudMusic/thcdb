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
	let [show, setShow] = createSignal(false)

	let [ref, setRef] = createSignal<HTMLElement | undefined>()

	let callback = (event: MouseEvent) => {
		if (event.type == "mouseup") return
		let isInside = ref() ? event.composedPath().includes(ref()!) : false
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
