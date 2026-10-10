import { cleanup, render } from "@solidjs/testing-library"
import type { Setter } from "solid-js"
import { createSignal } from "solid-js"
import { afterEach, describe, expect, it } from "vitest"

import { createInfiniteScroll } from "./createInfiniteScroll"

describe("infinite scroll", () => {
	afterEach(cleanup)

	it("loads more when an already visible trigger becomes enabled", async () => {
		expect.hasAssertions()
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

			return (
				<div
					ref={setTriggerRef}
					style={{ width: "1px", height: "1px" }}
				></div>
			)
		}

		render(() => <InfiniteScroll />)
		expect(loadMoreCount).toBe(0)
		enable(true)

		await expect.poll(() => loadMoreCount).toBe(1)
	})
})
