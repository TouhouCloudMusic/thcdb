import { InfiniteQueryObserver, QueryClient } from "@tanstack/solid-query"
import { describe, expect, it, vi } from "vitest"

import { infiniteQueryState } from "./infiniteQueryState"

type Page = { rows: number[]; next?: number }

function selectRows(page: Page) {
	return page.rows
}

describe("infinite query failures", () => {
	it("keeps loaded rows and retries the failed next cursor", async () => {
		expect.hasAssertions()
		const client = new QueryClient()
		const fetchPage = vi
			.fn<(cursor: number) => Promise<Page>>()
			.mockResolvedValueOnce({ rows: [1], next: 1 })
			.mockRejectedValueOnce(new Error("Page unavailable"))
			.mockResolvedValueOnce({ rows: [2] })
		const observer = new InfiniteQueryObserver(client, {
			queryKey: ["rows"],
			queryFn: ({ pageParam }) => fetchPage(pageParam),
			getNextPageParam: (page) => page.next,
			initialPageParam: 0,
			retry: false,
			enabled: false,
		})
		const unsubscribe = observer.subscribe(vi.fn())

		try {
			await observer.refetch()
			await observer.fetchNextPage()

			const failure = infiniteQueryState(
				observer.getCurrentResult(),
				selectRows,
			)
			expect(failure).toMatchObject({
				kind: "ready",
				data: { items: [1], pagination: { kind: "fetch-next-error" } },
			})
			if (failure.kind !== "ready") throw new Error("Expected cached rows")
			const { pagination } = failure.data
			if (pagination.kind !== "fetch-next-error") {
				throw new Error("Expected a next-page error")
			}
			pagination.retry()

			expect(
				infiniteQueryState(observer.getCurrentResult(), selectRows),
			).toMatchObject({
				kind: "ready",
				data: { items: [1], pagination: { kind: "fetching" } },
			})
			await vi.waitFor(() =>
				expect(
					infiniteQueryState(observer.getCurrentResult(), selectRows),
				).toStrictEqual({
					kind: "ready",
					data: { items: [1, 2], pagination: { kind: "end" } },
				}),
			)
			expect(fetchPage.mock.calls).toStrictEqual([[0], [1], [1]])
		} finally {
			unsubscribe()
			client.clear()
		}
	})

	it("keeps a cached empty page and retries its failed refresh", async () => {
		expect.hasAssertions()
		const client = new QueryClient()
		const fetchPage = vi
			.fn<(cursor: number) => Promise<Page>>()
			.mockResolvedValueOnce({ rows: [], next: 1 })
			.mockRejectedValueOnce(new Error("Page unavailable"))
			.mockResolvedValueOnce({ rows: [1] })
		const observer = new InfiniteQueryObserver(client, {
			queryKey: ["rows"],
			queryFn: ({ pageParam }) => fetchPage(pageParam),
			getNextPageParam: (page) => page.next,
			initialPageParam: 0,
			retry: false,
			enabled: false,
		})
		const unsubscribe = observer.subscribe(vi.fn())

		try {
			await observer.refetch()
			expect(
				infiniteQueryState(observer.getCurrentResult(), selectRows),
			).toMatchObject({
				kind: "ready",
				data: { items: [], pagination: { kind: "more" } },
			})

			await observer.refetch()
			const failure = infiniteQueryState(
				observer.getCurrentResult(),
				selectRows,
			)
			expect(failure).toMatchObject({
				kind: "ready",
				data: { items: [], pagination: { kind: "refresh-error" } },
			})
			if (failure.kind !== "ready") throw new Error("Expected a cached page")
			const { pagination } = failure.data
			if (pagination.kind !== "refresh-error") {
				throw new Error("Expected a refresh error")
			}
			pagination.retry()

			expect(
				infiniteQueryState(observer.getCurrentResult(), selectRows),
			).toMatchObject({
				kind: "ready",
				data: { items: [], pagination: { kind: "refreshing" } },
			})
			await vi.waitFor(() =>
				expect(
					infiniteQueryState(observer.getCurrentResult(), selectRows),
				).toStrictEqual({
					kind: "ready",
					data: { items: [1], pagination: { kind: "end" } },
				}),
			)
			expect(fetchPage.mock.calls).toStrictEqual([[0], [0], [0]])
		} finally {
			unsubscribe()
			client.clear()
		}
	})
})
