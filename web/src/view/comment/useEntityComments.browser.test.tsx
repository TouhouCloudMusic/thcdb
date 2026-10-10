import { cleanup, renderHook, waitFor } from "@solidjs/testing-library"
import type { UserProfile } from "@thc/api"
import { http, HttpResponse } from "msw/http"
import type { ParentProps } from "solid-js"
import * as v from "valibot"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import type { Comment } from "~/hey-api"
import { vCreateEntityCommentRequest } from "~/hey-api/valibot.gen"
import { QUERY_CLIENT, TanStackProvider } from "~/state/tanstack"
import { UserContextProvider, useCurrentUser } from "~/state/user"
import { worker } from "~/test/browser"

import { useEntityComments } from "./useEntityComments"

const TARGET_ID = 104
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
		let createdCommentId = 100

		worker.use(
			http.get("*/api/profile", () =>
				HttpResponse.json({ status: "Ok", data: userProfile() }),
			),
			http.post(
				`*/api/correction/${TARGET_ID}/comments`,
				async ({ request }) => {
					const json: unknown = await request.json()
					const body = v.parse(vCreateEntityCommentRequest, json)
					readBoundaries.push(body.read_through_comment_id)
					const created = comment(
						createdCommentId,
						body.content,
						CURRENT_USER_ID,
					)
					createdCommentId += 1

					return HttpResponse.json({ status: "Ok", data: created })
				},
			),
		)

		const { result } = renderHook(
			() => ({
				user: useCurrentUser(),
				model: useEntityComments(() => ({
					entityType: "correction",
					entityId: TARGET_ID,
					initialPage: {
						data: {
							items: [comment(LOADED_COMMENT_ID, "Last loaded comment")],
							next_cursor: LOADED_COMMENT_ID,
							active_count: 2,
						},
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

		expect(readBoundaries).toStrictEqual([LOADED_COMMENT_ID, LOADED_COMMENT_ID])
	})
})
