// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@solidjs/testing-library"
import type { Setter } from "solid-js"
import { createSignal } from "solid-js"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createInfiniteScroll } from "./createInfiniteScroll"

class IntersectionObserverMock implements IntersectionObserver {
	readonly callback: IntersectionObserverCallback
	readonly root = null
	readonly rootMargin = "0px"
	readonly scrollMargin = "0px"
	readonly thresholds = [0]
	readonly disconnect = vi.fn<() => void>()
	readonly unobserve = vi.fn<(target: Element) => void>()
	readonly takeRecords = vi.fn<() => IntersectionObserverEntry[]>(() => [])

	constructor(callback: IntersectionObserverCallback) {
		this.callback = callback
	}

	readonly observe = vi.fn<(target: Element) => void>((target) => {
		const entry = {
			boundingClientRect: new DOMRect(),
			intersectionRatio: 1,
			intersectionRect: new DOMRect(),
			isIntersecting: true,
			rootBounds: null,
			target,
			time: 0,
		} satisfies IntersectionObserverEntry
		globalThis.queueMicrotask(() => {
			this.callback([entry], this)
		})
	})
}

describe("infinite scroll", () => {
	afterEach(() => {
		cleanup()
		vi.unstubAllGlobals()
	})

	it("loads more when an already visible trigger becomes enabled", async () => {
		expect.hasAssertions()
		vi.stubGlobal("IntersectionObserver", IntersectionObserverMock)
		let enable!: Setter<boolean>
		let loadMoreCount = 0

		function InfiniteScroll() {
			const [enabled, setEnabled] = createSignal(false)
			enable = setEnabled
			const setTriggerRef = createInfiniteScroll({
				enabled,
				onLoadMore: () => {
					loadMoreCount += 1
				},
			})

			return <div ref={setTriggerRef}></div>
		}

		render(() => <InfiniteScroll />)
		await Promise.resolve()
		expect(loadMoreCount).toBe(0)
		enable(true)

		await waitFor(() => expect(loadMoreCount).toBe(1))
	})
})
