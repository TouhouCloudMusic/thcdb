import { debounce } from "@thc/toolkit"
import type { Accessor, Setter } from "solid-js"
import {
	onMount,
	createSignal,
	onCleanup,
	createEffect,
	createContext,
	useContext,
} from "solid-js"

type ComboboxScrollContextValue = {
	scrollContainer: Accessor<HTMLElement | undefined>
	setScrollContainer: Setter<HTMLElement | undefined>
	highlightedItem: Accessor<HTMLElement | undefined>
	setHighlightedItem: Setter<HTMLElement | undefined>
	scrollToItem: (item: HTMLElement) => void
}

export const ComboboxScrollContext = createContext<ComboboxScrollContextValue>()

export function useComboboxScroll(): ComboboxScrollContextValue {
	const context = useContext(ComboboxScrollContext)
	if (!context) {
		throw new Error(
			"useComboboxScroll must be used within a ComboboxScrollProvider",
		)
	}
	return context
}

const isTargetKey = (e: KeyboardEvent) => {
	return e.code === "ArrowUp" || e.code === "ArrowDown"
}

const SCROLL_DELAY = 150
export function createComboboxScrollContext(): ComboboxScrollContextValue {
	const [scrollContainer, setScrollContainer] = createSignal<HTMLElement>()
	const [highlightedItem, setHighlightedItem] = createSignal<HTMLElement>()
	const [scrollBehavior, setScrollBehavior] =
		createSignal<ScrollBehavior>("smooth")

	// TODO: Find a better way to remove the second debounced function
	const delayedSetBehaviorUp = debounce(SCROLL_DELAY, () => {
		setScrollBehavior("instant")
	})
	const delayedSetBehaviorDown = debounce(SCROLL_DELAY, () => {
		setScrollBehavior("instant")
	})

	onMount(() => {
		let handleKeyDown = (e: KeyboardEvent) => {
			if (!isTargetKey(e)) return
			if (e.code === "ArrowUp") {
				delayedSetBehaviorUp()
			} else if (e.code === "ArrowDown") {
				delayedSetBehaviorDown()
			}
		}

		let handleKeyUp = (e: KeyboardEvent) => {
			if (!isTargetKey(e)) return
			if (e.code === "ArrowUp") {
				delayedSetBehaviorUp.cancel()
			} else if (e.code === "ArrowDown") {
				delayedSetBehaviorDown.cancel()
			}

			setScrollBehavior("smooth")
		}

		document.addEventListener("keydown", handleKeyDown)
		document.addEventListener("keyup", handleKeyUp)

		onCleanup(() => {
			document.removeEventListener("keydown", handleKeyDown)
			document.removeEventListener("keyup", handleKeyUp)
			delayedSetBehaviorUp.cancel()
			delayedSetBehaviorDown.cancel()
		})
	})

	const scrollToItem = (item: HTMLElement) => {
		const container = scrollContainer()
		if (!container) return

		const itemTop = item.offsetTop
		const itemBottom = itemTop + item.offsetHeight
		const viewTop = container.scrollTop
		const viewBottom = viewTop + container.clientHeight

		if (itemTop < viewTop) {
			container.scrollTo({
				top: itemTop,
				behavior: scrollBehavior(),
			})
		} else if (itemBottom > viewBottom) {
			container.scrollTo({
				top: itemBottom - container.clientHeight,
				behavior: scrollBehavior(),
			})
		}
	}

	createEffect(() => {
		const item = highlightedItem()
		if (item) {
			scrollToItem(item)
		}
	})

	return {
		scrollContainer,
		setScrollContainer,
		highlightedItem,
		setHighlightedItem,
		scrollToItem,
	}
}
