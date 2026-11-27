import { cleanup, renderHook, waitFor } from "@solidjs/testing-library"
import type { UserProfile } from "@thc/api"
import { http, HttpResponse } from "msw/http"
import { createComputed, createSignal } from "solid-js"
import type { ParentProps } from "solid-js"
import * as v from "valibot"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import type { Comment } from "~/hey-api"
import {
	findEntityCommentsInfiniteQueryKey,
	findEntityCommentsQueryKey,
} from "~/hey-api/@tanstack/solid-query.gen"
import { vCreateEntityCommentRequest } from "~/hey-api/valibot.gen"
import { QUERY_CLIENT, TanStackProvider } from "~/state/tanstack"
import { UserContextProvider, useCurrentUser } from "~/state/user"
import { worker } from "~/test/browser"

import { useEntityComments } from "./useEntityComments"

const TARGET_ID = 104
const COMMENTS_PATH = `*/api/correction/${TARGET_ID}/comments`
const CURRENT_USER_ID = 7
const LOADED_COMMENT_ID = 20
const DEFAULT_QUERY_CLIENT_OPTIONS = QUERY_CLIENT.getDefaultOptions()

function userProfile(): UserProfile {
	return {
		id: CURRENT_USER_ID,
		name: "reimu",
		last_login: "2026-08-17T00:00:00Z",
		permissions: [],
		roles: [],
		stats: {
			edit_count: 0,
			vote_count: 0,
		},
	}
}

function comment(id: number, content: string, authorId = 2): Comment {
	return {
		id,
		in_reply_to_comment_id: null,
		author: {
			id: authorId,
			name: authorId === CURRENT_USER_ID ? "reimu" : "marisa",
		},
		content,
		state: "Active",
		created_at: "2026-08-17T00:00:00Z",
		updated_at: "2026-08-17T00:00:00Z",
	}
}

function Providers(props: ParentProps) {
	return (
		<TanStackProvider>
			<UserContextProvider>{props.children}</UserContextProvider>
		</TanStackProvider>
	)
}

describe("entity comments", () => {
	beforeEach(() => {
		QUERY_CLIENT.setDefaultOptions({
			...DEFAULT_QUERY_CLIENT_OPTIONS,
			queries: {
				...DEFAULT_QUERY_CLIENT_OPTIONS.queries,
				retry: false,
			},
		})
		worker.use(
			http.get("*/api/profile", () =>
				HttpResponse.json({ status: "Ok", data: userProfile() }),
			),
		)
		globalThis.localStorage.clear()
	})

	afterEach(() => {
		cleanup()
		QUERY_CLIENT.clear()
		QUERY_CLIENT.setDefaultOptions(DEFAULT_QUERY_CLIENT_OPTIONS)
		globalThis.localStorage.clear()
	})

	it("posting twice does not advance the read boundary beyond loaded comments", async () => {
		expect.hasAssertions()
		const readBoundaries: (number | null | undefined)[] = []
		const initialPage = {
			items: [comment(LOADED_COMMENT_ID, "Last loaded comment")],
			next_cursor: LOADED_COMMENT_ID,
			active_count: 2,
		}
		const posted: Comment[] = []

		worker.use(
			http.get(COMMENTS_PATH, () =>
				HttpResponse.json({
					status: "Ok",
					data: {
						...initialPage,
						items: [...initialPage.items, ...posted],
						active_count: initialPage.active_count + posted.length,
					},
				}),
			),
			http.post(COMMENTS_PATH, async ({ request }) => {
				const json: unknown = await request.json()
				const body = v.parse(vCreateEntityCommentRequest, json)
				readBoundaries.push(body.read_through_comment_id)
				const created = comment(
					100 + posted.length,
					body.content,
					CURRENT_USER_ID,
				)
				posted.push(created)

				return HttpResponse.json({ status: "Ok", data: created })
			}),
		)

		const { result } = renderHook(
			() => ({
				user: useCurrentUser(),
				model: useEntityComments(() => ({
					entityType: "correction",
					entityId: TARGET_ID,
					initialPage: {
						data: initialPage,
						updatedAt: Date.now(),
					},
				})),
			}),
			{ wrapper: Providers },
		)

		await waitFor(() => expect(result.user.profile?.id).toBe(CURRENT_USER_ID))
		await result.model.createComment("First local comment", null)
		await waitFor(() => {
			expect(result.model.comments().map((item) => item.id)).toStrictEqual([
				LOADED_COMMENT_ID,
				100,
			])
		})

		await result.model.createComment("Second local comment", null)
		await waitFor(() => expect(result.model.activeCommentCount()).toBe(4))

		expect(readBoundaries).toStrictEqual([LOADED_COMMENT_ID, LOADED_COMMENT_ID])
	})

	it("keeps the list and count current when posting during a stale refresh and then deleting", async () => {
		expect.hasAssertions()
		const content = "New comment"
		const created = comment(100, content, CURRENT_USER_ID)
		const refreshStarted = Promise.withResolvers<undefined>()
		const refreshResponse = Promise.withResolvers<undefined>()
		let refreshing = false
		let refreshFinished = false

		worker.use(
			http.get(COMMENTS_PATH, async () => {
				if (refreshing) {
					refreshStarted.resolve(undefined)
					await refreshResponse.promise
					refreshFinished = true
				}
				return HttpResponse.json({
					status: "Ok",
					data: { items: [], active_count: 0 },
				})
			}),
			http.post(COMMENTS_PATH, () =>
				HttpResponse.json({ status: "Ok", data: created }),
			),
			http.delete(`*/api/comment/${created.id}`, () =>
				HttpResponse.json({ status: "Ok", message: "Deleted" }),
			),
		)

		const { result } = renderHook(
			() => ({
				user: useCurrentUser(),
				model: useEntityComments(() => ({
					entityType: "correction",
					entityId: TARGET_ID,
				})),
			}),
			{ wrapper: Providers },
		)

		await waitFor(() => {
			expect(result.user.profile?.id).toBe(CURRENT_USER_ID)
			expect(result.model.activeCommentCount()).toBe(0)
		})
		refreshing = true
		const refresh = QUERY_CLIENT.invalidateQueries({
			queryKey: findEntityCommentsInfiniteQueryKey({
				path: { target_type: "correction", id: TARGET_ID },
			}),
		})
		try {
			await refreshStarted.promise
			await result.model.createComment(content, null)
		} finally {
			refreshResponse.resolve(undefined)
		}
		await refresh
		await waitFor(() => expect(refreshFinished).toBe(true))
		await waitFor(() => expect(result.model.activeCommentCount()).toBe(1))
		expect(result.model.comments().map((item) => item.id)).toStrictEqual([
			created.id,
		])
		await result.model.deleteComment(created.id)
		await waitFor(() => expect(result.model.activeCommentCount()).toBe(0))
	})

	it("counts a comment posted before the first page finishes loading", async () => {
		expect.hasAssertions()
		const listStarted = Promise.withResolvers<undefined>()
		const listResponse = Promise.withResolvers<undefined>()
		const content = "New comment"
		let created: Comment | undefined

		worker.use(
			http.get(COMMENTS_PATH, async () => {
				const items = created ? [created] : []
				listStarted.resolve(undefined)
				await listResponse.promise
				return HttpResponse.json({
					status: "Ok",
					data: { items, active_count: items.length },
				})
			}),
			http.post(COMMENTS_PATH, () => {
				created = comment(100, content, CURRENT_USER_ID)
				return HttpResponse.json({ status: "Ok", data: created })
			}),
		)

		const { result } = renderHook(
			() => ({
				user: useCurrentUser(),
				model: useEntityComments(() => ({
					entityType: "correction",
					entityId: TARGET_ID,
				})),
			}),
			{ wrapper: Providers },
		)

		try {
			await listStarted.promise
			await waitFor(() => expect(result.user.profile?.id).toBe(CURRENT_USER_ID))
			await result.model.createComment(content, null)
		} finally {
			listResponse.resolve(undefined)
		}

		await waitFor(() => expect(result.model.activeCommentCount()).toBe(1))
	})

	it("keeps the badge count when switching tabs and refreshes it without loading the closed list", async () => {
		expect.hasAssertions()
		const displayedCounts: (number | undefined)[] = []
		const listStarted = Promise.withResolvers<undefined>()
		const listResponse = Promise.withResolvers<undefined>()
		let badgeCount = 2
		let listRequests = 0

		worker.use(
			http.get(COMMENTS_PATH, async ({ request }) => {
				const countOnly = new URL(request.url).searchParams.get("limit") === "1"
				if (!countOnly) {
					listRequests += 1
					listStarted.resolve(undefined)
					await listResponse.promise
				}
				return HttpResponse.json({
					status: "Ok",
					data: { items: [], active_count: countOnly ? badgeCount : 3 },
				})
			}),
		)

		const { result } = renderHook(
			() => {
				const [listEnabled, setListEnabled] = createSignal(false)
				const model = useEntityComments(() => ({
					entityType: "correction",
					entityId: TARGET_ID,
					listEnabled: listEnabled(),
				}))
				createComputed(() => displayedCounts.push(model.activeCommentCount()))
				return { model, setListEnabled }
			},
			{ wrapper: Providers },
		)

		try {
			await waitFor(() => expect(result.model.activeCommentCount()).toBe(2))
			displayedCounts.length = 0
			expect(listRequests).toBe(0)

			result.setListEnabled(true)
			await listStarted.promise
			expect(result.model.activeCommentCount()).toBe(2)
		} finally {
			listResponse.resolve(undefined)
		}

		await waitFor(() => expect(result.model.activeCommentCount()).toBe(3))
		const loadedListRequests = listRequests
		result.setListEnabled(false)
		expect(result.model.activeCommentCount()).toBe(3)
		expect(displayedCounts).not.toContain(undefined)

		badgeCount = 4
		await QUERY_CLIENT.invalidateQueries({
			queryKey: findEntityCommentsQueryKey({
				path: { target_type: "correction", id: TARGET_ID },
			}),
		})
		await waitFor(() => expect(result.model.activeCommentCount()).toBe(4))
		expect(listRequests).toBe(loadedListRequests)
	})

	it("provides the count even when the first list request fails", async () => {
		expect.hasAssertions()
		worker.use(
			http.get(COMMENTS_PATH, ({ request }) => {
				const countOnly = new URL(request.url).searchParams.get("limit") === "1"
				if (!countOnly) {
					return HttpResponse.json(
						{ message: "List unavailable" },
						{ status: 500 },
					)
				}
				return HttpResponse.json({
					status: "Ok",
					data: { items: [], active_count: 2 },
				})
			}),
		)

		const { result: model } = renderHook(
			() =>
				useEntityComments(() => ({
					entityType: "correction",
					entityId: TARGET_ID,
				})),
			{ wrapper: Providers },
		)

		await waitFor(() => expect(model.activeCommentCount()).toBe(2))
		expect(model.errorMessage()).toBe("List unavailable")
	})
})
