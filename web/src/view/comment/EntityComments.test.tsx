// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@solidjs/testing-library"
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterContextProvider,
} from "@tanstack/solid-router"
import userEvent from "@testing-library/user-event"
import type { UserProfile } from "@thc/api"
import { CorrectionQueryOption } from "@thc/query"
import * as v from "valibot"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Comment, CommentPage } from "~/hey-api"
import { vCreateEntityCommentRequest } from "~/hey-api/valibot.gen"
import {
	MOCK_CORRECTION_DETAIL,
	MOCK_CORRECTION_DIFF,
	MOCK_CORRECTION_HISTORY_ENTITY_TYPE,
	MOCK_CORRECTION_ID,
} from "~/mock/correction"
import { I18NProvider } from "~/state/i18n"
import { QUERY_CLIENT, TanStackProvider } from "~/state/tanstack"
import { UserContextProvider } from "~/state/user"
import { CorrectionDetailPage } from "~/view/correction/Detail"

// TODO: pure model test

const TARGET_ID = MOCK_CORRECTION_ID
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

function requestFrom(input: RequestInfo | URL): Request {
	return input instanceof Request ? input : new Request(input)
}

function firstPageWithMoreComments(lastCommentContent: string): CommentPage {
	return {
		items: [comment(LOADED_COMMENT_ID, lastCommentContent)],
		next_cursor: LOADED_COMMENT_ID,
		active_count: 2,
	}
}

function renderCorrectionDetail(initialPage: CommentPage) {
	QUERY_CLIENT.setQueryData(CorrectionQueryOption.detail(TARGET_ID).queryKey, {
		...MOCK_CORRECTION_DETAIL,
		comments: initialPage,
	})
	QUERY_CLIENT.setQueryData(
		CorrectionQueryOption.diff(TARGET_ID).queryKey,
		MOCK_CORRECTION_DIFF,
	)
	QUERY_CLIENT.setQueryData(
		CorrectionQueryOption.history(
			MOCK_CORRECTION_HISTORY_ENTITY_TYPE,
			MOCK_CORRECTION_DETAIL.entity_id,
		).queryKey,
		[],
	)

	const router = createRouter({
		routeTree: createRootRoute(),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	})

	return render(() => (
		<TanStackProvider>
			<UserContextProvider>
				<RouterContextProvider router={router}>
					{() => (
						<I18NProvider initialLocale="en">
							<CorrectionDetailPage
								correctionId={TARGET_ID}
								onCompareIdChange={vi.fn<(value: number | undefined) => void>()}
							/>
						</I18NProvider>
					)}
				</RouterContextProvider>
			</UserContextProvider>
		</TanStackProvider>
	))
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
		vi.restoreAllMocks()
	})

	it("posting twice does not advance the read boundary beyond loaded comments", async () => {
		expect.hasAssertions()
		const readBoundaries: (number | null | undefined)[] = []
		let createdCommentId = 100

		vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
			const request = requestFrom(input)
			const url = new URL(request.url)

			if (request.method === "GET" && url.pathname === "/api/profile") {
				return Response.json({ status: "Ok", data: userProfile() })
			}

			if (
				request.method === "POST"
				&& url.pathname === `/api/correction/${TARGET_ID}/comments`
			) {
				const json: unknown = await request.json()
				const body = v.parse(vCreateEntityCommentRequest, json)
				readBoundaries.push(body.read_through_comment_id)
				const created = comment(createdCommentId, body.content, CURRENT_USER_ID)
				createdCommentId += 1

				return Response.json({ status: "Ok", data: created })
			}

			throw new Error(`Unexpected request: ${request.method} ${url.href}`)
		})

		const view = renderCorrectionDetail(
			firstPageWithMoreComments("Last loaded comment"),
		)
		const user = userEvent.setup()
		const input = await view.findByPlaceholderText("Add a comment...")

		await user.type(input, "First local comment")
		await user.click(view.getByRole("button", { name: "Comment" }))
		await view.findByText("First local comment")

		await user.type(input, "Second local comment")
		await user.click(view.getByRole("button", { name: "Comment" }))
		await view.findByText("Second local comment")

		expect(readBoundaries).toStrictEqual([LOADED_COMMENT_ID, LOADED_COMMENT_ID])
	})

	it("keeps loaded comments available when loading more fails", async () => {
		expect.hasAssertions()

		vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
			const request = requestFrom(input)
			const url = new URL(request.url)

			if (request.method === "GET" && url.pathname === "/api/profile") {
				return Promise.resolve(
					Response.json({ status: "Ok", data: userProfile() }),
				)
			}

			if (
				request.method === "GET"
				&& url.pathname === `/api/correction/${TARGET_ID}/comments`
				&& url.searchParams.get("cursor") === LOADED_COMMENT_ID.toString()
			) {
				return Promise.reject(new Error("Failed to load more comments"))
			}

			return Promise.reject(
				new Error(`Unexpected request: ${request.method} ${url.href}`),
			)
		})

		const view = renderCorrectionDetail(
			firstPageWithMoreComments("Retained comment"),
		)
		const user = userEvent.setup()

		await user.click(await view.findByRole("button", { name: "Load more" }))
		await waitFor(() => {
			expect(view.getByText("Failed to load more comments")).toBeInTheDocument()
		})
		expect(view.getByText("Retained comment")).toBeInTheDocument()
		expect(view.getByRole("button", { name: "Load more" })).toBeInTheDocument()
	})
})
