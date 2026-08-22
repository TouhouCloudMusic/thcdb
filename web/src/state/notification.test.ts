// @vitest-environment jsdom
import { cleanup, renderHook } from "@solidjs/testing-library"
import type { InfiniteData } from "@tanstack/solid-query"
import { useInfiniteQuery, useQuery } from "@tanstack/solid-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import type {
	DataNotificationPage,
	DataUnreadCount,
	ListNotificationsData,
} from "~/hey-api"
import {
	listNotificationsInfiniteOptions,
	unreadCountOptions,
} from "~/hey-api/@tanstack/solid-query.gen"
import { QUERY_CLIENT, TanStackProvider } from "~/state/tanstack"

import { refreshNotificationQueries } from "./notification"

const loadPage = vi.fn<() => Promise<DataNotificationPage>>()
const loadUnreadCount = vi.fn<() => Promise<DataUnreadCount>>()
const loadUnrelated = vi.fn<() => Promise<string>>()

type NotificationPageParam = {
	query: NonNullable<ListNotificationsData["query"]>
}

const FIRST_PAGE_PARAM: NotificationPageParam = { query: {} }
const OLDER_PAGE_PARAM: NotificationPageParam = {
	query: {
		cursor_snapshot_inbox_seq: "10",
		cursor_before_inbox_seq: "5",
	},
}

const INBOX_LIST_OPTIONS = {
	query: {
		state: "inbox",
		category: undefined,
		limit: 20,
	},
} satisfies Parameters<typeof listNotificationsInfiniteOptions>[0]

function notificationPage(itemId: string): DataNotificationPage {
	return {
		status: "Ok",
		data: {
			items: [
				{
					id: itemId,
					body: {
						actor: { id: 1, name: itemId },
						kind: "UserFollowed",
					},
					created_at: "2026-08-11T00:00:00Z",
					last_activity_at: "2026-08-11T00:00:00Z",
					through_seq: "1",
					is_unread: true,
				},
			],
			next_cursor: null,
			snapshot_inbox_seq: "10",
		},
	}
}

function unreadCount(count: number): DataUnreadCount {
	return {
		status: "Ok",
		data: { count },
	}
}

function useNotificationList(
	initialData: InfiniteData<DataNotificationPage, NotificationPageParam>,
) {
	return useInfiniteQuery(() => ({
		...listNotificationsInfiniteOptions(INBOX_LIST_OPTIONS),
		queryFn: loadPage,
		retry: false,
		staleTime: Infinity,
		initialPageParam: FIRST_PAGE_PARAM,
		getNextPageParam: () => undefined,
		initialData,
	}))
}

describe("notification query refresh", () => {
	afterEach(() => {
		cleanup()
		QUERY_CLIENT.clear()
		loadPage.mockReset()
		loadUnreadCount.mockReset()
		loadUnrelated.mockReset()
	})

	it("refreshes notification data and resets inbox pagination", async () => {
		expect.hasAssertions()

		loadPage.mockResolvedValue(notificationPage("latest"))
		loadUnreadCount.mockResolvedValue(unreadCount(2))
		const { result: models } = renderHook(
			() => {
				const list = useNotificationList({
					pages: [notificationPage("current"), notificationPage("older")],
					pageParams: [FIRST_PAGE_PARAM, OLDER_PAGE_PARAM],
				})
				const unread = useQuery(() => ({
					...unreadCountOptions(),
					queryFn: loadUnreadCount,
					retry: false,
					staleTime: Infinity,
					initialData: unreadCount(1),
				}))

				return { list, unread }
			},
			{ wrapper: TanStackProvider },
		)

		expect(models.list.data.pages).toStrictEqual([
			notificationPage("current"),
			notificationPage("older"),
		])
		expect(models.unread.data.data.count).toBe(1)

		await refreshNotificationQueries()

		expect(models.list.data.pages).toStrictEqual([notificationPage("latest")])
		expect(models.unread.data.data.count).toBe(2)
	})

	it("keeps the first page when refreshing fails", async () => {
		expect.hasAssertions()

		loadPage.mockRejectedValue(new Error("refresh failed"))
		const { result: list } = renderHook(
			() =>
				useNotificationList({
					pages: [notificationPage("current"), notificationPage("older")],
					pageParams: [FIRST_PAGE_PARAM, OLDER_PAGE_PARAM],
				}),
			{ wrapper: TanStackProvider },
		)
		expect(list.data.pageParams).toStrictEqual([
			FIRST_PAGE_PARAM,
			OLDER_PAGE_PARAM,
		])

		await refreshNotificationQueries()

		expect(list.data.pages).toStrictEqual([notificationPage("current")])
		expect(list.data.pageParams).toStrictEqual([FIRST_PAGE_PARAM])
		expect(list.isRefetchError).toBe(true)
	})

	it("leaves unrelated query data unchanged", async () => {
		expect.hasAssertions()

		loadUnrelated.mockResolvedValue("refreshed")
		const { result: unrelated } = renderHook(
			() =>
				useQuery(() => ({
					queryKey: ["unrelated"],
					queryFn: loadUnrelated,
					staleTime: Infinity,
					initialData: "unchanged",
				})),
			{ wrapper: TanStackProvider },
		)

		await refreshNotificationQueries()

		expect(unrelated.data).toBe("unchanged")
	})

	it("exposes the latest data after a refresh is requested during an active refresh", async () => {
		expect.hasAssertions()

		const firstRequest = Promise.withResolvers<DataNotificationPage>()
		const firstRequestStarted = Promise.withResolvers<undefined>()
		loadPage
			.mockImplementationOnce(async () => {
				firstRequestStarted.resolve(undefined)
				return firstRequest.promise
			})
			.mockResolvedValue(notificationPage("latest"))
		const { result: list } = renderHook(
			() =>
				useNotificationList({
					pages: [notificationPage("current")],
					pageParams: [FIRST_PAGE_PARAM],
				}),
			{ wrapper: TanStackProvider },
		)

		const firstRefresh = refreshNotificationQueries()
		await firstRequestStarted.promise

		const secondRefresh = refreshNotificationQueries()
		firstRequest.resolve(notificationPage("stale"))

		await Promise.all([firstRefresh, secondRefresh])

		expect(list.data.pages).toStrictEqual([notificationPage("latest")])
	})
})
