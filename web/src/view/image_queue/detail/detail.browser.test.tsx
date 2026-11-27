import {
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@solidjs/testing-library"
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterContextProvider,
	RouterProvider,
} from "@tanstack/solid-router"
import { http, HttpResponse } from "msw/http"
import * as v from "valibot"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { page, userEvent } from "vitest/browser"

import { AppToastRegion } from "~/component/toast"
import { USER_PERMISSION_NAMES } from "~/domain/user/constants"
import type {
	Comment,
	CursorResponsePendingImageQueueItem,
	ImageQueueDetail,
	ImageQueueStatus,
} from "~/hey-api"
import { imageQueueDetailQueryKey } from "~/hey-api/@tanstack/solid-query.gen"
import { vCreateEntityCommentRequest } from "~/hey-api/valibot.gen"
import { routeTree } from "~/routeTree.gen"
import { StateProvider } from "~/state"
import { I18NProvider } from "~/state/i18n"
import { loadLocale } from "~/state/i18n/runtime"
import { QUERY_CLIENT, TanStackProvider } from "~/state/tanstack"
import { createUserStore, UserContextProvider } from "~/state/user"
import "~/style/style.css"
import { worker } from "~/test/browser"

import { ImageQueueDetailPage } from "."

const ENTRY_ID = 23
const TARGET_ID = 17
const DATE = "2026-11-19T14:32:00+09:00"
const MEMBER = { id: 7, name: "Mina" }
const REVIEWER = { id: 8, name: "Aya" }
const QUEUE_PATH = `*/api/image-queue/${ENTRY_ID}`
const CURRENT = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="136" height="136"/>')}`
const PROPOSED = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="400"/>')}`

function openDetail(options?: {
	canModerate?: boolean
	currentCover?: string
	status?: ImageQueueStatus
	description?: string
}) {
	const canModerate = options?.canModerate ?? true
	const user = canModerate ? REVIEWER : MEMBER
	const router = createRouter({
		routeTree: createRootRoute(),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	})
	const detail: ImageQueueDetail = {
		id: ENTRY_ID,
		status: options?.status ?? "Pending",
		created_at: DATE,
		description: options?.description ?? null,
		created_by: MEMBER,
		handled_by: options?.status === "Approved" ? REVIEWER : undefined,
		handled_at: options?.status === "Approved" ? DATE : undefined,
		target: {
			kind: "release",
			id: TARGET_ID,
			name: "Lovelight",
			current_image_url: options?.currentCover ?? null,
		},
		image: { id: 91, url: PROPOSED, uploaded_at: DATE, uploaded_by: MEMBER },
		is_subscribed: false,
	}
	const comments: Comment[] = []

	worker.use(
		http.get("*/api/profile", () =>
			HttpResponse.json({
				status: "Ok",
				data: {
					...user,
					last_login: DATE,
					permissions: canModerate
						? [USER_PERMISSION_NAMES.ImageQueueManage]
						: [],
					roles: [],
					stats: { edit_count: 0, vote_count: 0 },
				},
			}),
		),
		http.get(QUEUE_PATH, () =>
			HttpResponse.json({ status: "Ok", data: detail }),
		),
		http.get(`${QUEUE_PATH}/comments`, () =>
			HttpResponse.json({
				status: "Ok",
				data: {
					items: comments,
					active_count: comments.length,
					next_cursor: null,
				},
			}),
		),
	)

	render(() => (
		<RouterContextProvider router={router}>
			{() => (
				<I18NProvider initialLocale="en">
					<TanStackProvider>
						<UserContextProvider>
							<ImageQueueDetailPage entryId={ENTRY_ID} />
							<AppToastRegion />
						</UserContextProvider>
					</TanStackProvider>
				</I18NProvider>
			)}
		</RouterContextProvider>
	))

	return { detail, comments }
}

const queueItems = [
	{
		id: 22,
		status: "Pending",
		target: { type: "artist", name: "Moon Garden" },
	},
	{
		id: 23,
		status: "Approved",
		target: { type: "release", name: "Lovelight" },
	},
	{
		id: 24,
		status: "Rejected",
		target: { type: "release", name: "Starlight" },
	},
] as const

function queuePage(
	search: URLSearchParams,
): CursorResponsePendingImageQueueItem {
	const items = queueItems
		.filter(
			(item) =>
				(!search.has("type") || item.target.type === search.get("type"))
				&& (!search.has("status") || item.status === search.get("status")),
		)
		.map(({ id, status, target }) => ({
			id,
			status,
			target,
			created_at: DATE,
			created_by: MEMBER,
		}))
	return { items, next_cursor: null }
}

function openQueueRoute(path: string, getPage = queuePage) {
	worker.use(
		http.get("*/api/profile", () => new HttpResponse(null, { status: 401 })),
		http.get("*/api/image-queue", ({ request }) => {
			const search = new URL(request.url).searchParams
			return HttpResponse.json({
				status: "Ok",
				data: getPage(search),
			})
		}),
		http.get("*/api/image-queue/:id", ({ params }) => {
			const index = queueItems.findIndex(
				(item) => item.id.toString() === params["id"],
			)
			const item = queueItems[index]
			if (!item) return new HttpResponse(null, { status: 404 })
			return HttpResponse.json({
				status: "Ok",
				data: {
					id: item.id,
					status: item.status,
					created_at: DATE,
					description: null,
					created_by: MEMBER,
					target: {
						kind: item.target.type,
						id: item.id,
						name: item.target.name,
						current_image_url: null,
					},
					previous_id: queueItems[index - 1]?.id,
					next_id: queueItems[index + 1]?.id,
					is_subscribed: false,
				} satisfies ImageQueueDetail,
			})
		}),
		http.get("*/api/image-queue/:id/comments", () =>
			HttpResponse.json({
				status: "Ok",
				data: { items: [], active_count: 0, next_cursor: null },
			}),
		),
	)

	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [path] }),
		context: { currentUser: createUserStore() },
	})
	render(() => (
		<StateProvider initialLocale="en">
			<RouterProvider router={router} />
		</StateProvider>
	))
	return router
}

async function returnToQueue() {
	const breadcrumb = await screen.findByRole("navigation", {
		name: "Breadcrumb",
	})
	await userEvent.click(
		within(breadcrumb).getByRole("link", { name: "Image queue" }),
	)
}

async function openApproval() {
	await userEvent.click(await screen.findByRole("button", { name: "Approve" }))
	return within(
		await screen.findByRole("dialog", {
			name: "Approve the image for Lovelight?",
		}),
	)
}

async function expectImagePreview(
	trigger: HTMLElement,
	src: string,
	alt: string,
) {
	await waitFor(() => expect(trigger).toBeEnabled())
	await userEvent.click(trigger)
	const dialog = await screen.findByRole("dialog", { name: "Enlarged image" })
	const viewer = within(dialog)
	const image = viewer.getByRole("img")
	expect(image).toHaveAccessibleName(alt)
	expect(image).toHaveAttribute("src", src)
	await userEvent.keyboard("{Escape}")
	expect(dialog).not.toBeInTheDocument()
	await waitFor(() => expect(trigger).toHaveFocus())
}

describe("image queue detail", () => {
	beforeEach(async () => loadLocale("en"))
	afterEach(() => {
		cleanup()
		QUERY_CLIENT.clear()
	})

	it("opens and navigates details without carrying list filters", async () => {
		expect.hasAssertions()
		const router = openQueueRoute("/image-queue?type=release&status=approved")

		await userEvent.click(
			await screen.findByRole("link", { name: "Lovelight" }),
		)
		const previous = await screen.findByRole("link", {
			name: "Previous image queue entry",
		})
		expect(router.state.location).toMatchObject({
			pathname: "/image-queue/23",
			searchStr: "",
		})

		await userEvent.click(previous)
		await waitFor(() =>
			expect(router.state.location).toMatchObject({
				pathname: "/image-queue/22",
				searchStr: "",
			}),
		)

		await userEvent.click(
			await screen.findByRole("link", { name: "Next image queue entry" }),
		)
		await screen.findByRole("link", { name: "Previous image queue entry" })
		await userEvent.click(
			screen.getByRole("link", { name: "Next image queue entry" }),
		)
		await waitFor(() =>
			expect(router.state.location).toMatchObject({
				pathname: "/image-queue/24",
				searchStr: "",
			}),
		)

		await returnToQueue()
		await expect(
			screen.findByRole("link", { name: "Moon Garden" }),
		).resolves.toBeVisible()
		expect(router.state.location).toMatchObject({
			pathname: "/image-queue",
			searchStr: "",
		})
	})

	it("returns to the default pending queue from a direct entry", async () => {
		expect.hasAssertions()
		openQueueRoute("/image-queue/23")

		await returnToQueue()

		await expect(
			screen.findByRole("link", { name: "Moon Garden" }),
		).resolves.toBeVisible()
		expect(
			screen.queryByRole("link", { name: "Lovelight" }),
		).not.toBeInTheDocument()
	})

	it("includes pending and reviewed entries when status is all", async () => {
		openQueueRoute("/image-queue?status=all")

		await expect(
			screen.findByRole("link", { name: "Moon Garden" }),
		).resolves.toBeVisible()
		expect(screen.getByRole("link", { name: "Lovelight" })).toBeVisible()
		expect(screen.getByRole("link", { name: "Starlight" })).toBeVisible()
	})

	it("shows an empty queue when the last page has no entries", async () => {
		openQueueRoute("/image-queue?type=artist&status=rejected")

		await expect(
			screen.findByText("No entries match the current filters."),
		).resolves.toBeVisible()
		expect(screen.queryByText("No more entries")).not.toBeInTheDocument()
	})

	it("continues to the next page when the first has no entries", async () => {
		openQueueRoute("/image-queue", (search) =>
			search.get("cursor") === "42"
				? queuePage(search)
				: { items: [], next_cursor: 42 },
		)

		await expect(
			screen.findByRole("link", { name: "Moon Garden" }),
		).resolves.toBeVisible()
		expect(
			screen.queryByText("No entries match the current filters."),
		).not.toBeInTheDocument()
	})

	it("shows the submission description separately from the discussion", async () => {
		expect.hasAssertions()
		const note = "Cover scan from the original booklet."
		openDetail({ canModerate: false, description: note })

		await expect(screen.findByText(note)).resolves.toBeVisible()
		const discussion = screen.getByRole("region", { name: "Comments" })
		expect(within(discussion).queryByText(note)).not.toBeInTheDocument()
	})

	it("keeps the reply draft when the saved subscription changes", async () => {
		expect.hasAssertions()
		const { comments, detail } = openDetail()
		comments.push({
			id: 1,
			author: MEMBER,
			content: "Where is this scan from?",
			state: "Active",
			created_at: DATE,
			updated_at: DATE,
		})
		worker.use(
			http.post(`${QUEUE_PATH}/subscription`, ({ request }) => {
				detail.is_subscribed =
					new URL(request.url).searchParams.get("subscribed") === "true"
				return HttpResponse.json({
					status: "Ok",
					data: { subscribed: detail.is_subscribed },
				})
			}),
		)

		await userEvent.click(await screen.findByRole("button", { name: "Reply" }))
		const draft = "From the booklet."
		await userEvent.fill(
			screen.getByRole("textbox", { name: "Write a reply..." }),
			draft,
		)
		await userEvent.click(
			await screen.findByRole("button", { name: "Follow submission" }),
		)
		await expect(
			screen.findByRole("button", {
				name: "Unfollow submission",
				pressed: true,
			}),
		).resolves.toBeEnabled()
		expect(
			screen.getByRole("textbox", { name: "Write a reply..." }),
		).toHaveValue(draft)
	})

	it("keeps the saved subscription when an older detail request is in flight", async () => {
		expect.hasAssertions()
		const { detail } = openDetail()
		const follow = await screen.findByRole("button", {
			name: "Follow submission",
		})
		await waitFor(() => expect(follow).toBeEnabled())
		const oldRequestStarted = Promise.withResolvers<undefined>()
		const sendOldResponse = Promise.withResolvers<undefined>()
		const freshRequestStarted = Promise.withResolvers<undefined>()
		worker.use(
			http.get(QUEUE_PATH, async () => {
				const snapshot = { ...detail }
				if (snapshot.is_subscribed) {
					freshRequestStarted.resolve(undefined)
				} else {
					oldRequestStarted.resolve(undefined)
					await sendOldResponse.promise
				}
				return HttpResponse.json({ status: "Ok", data: snapshot })
			}),
			http.post(`${QUEUE_PATH}/subscription`, () => {
				detail.is_subscribed = true
				return HttpResponse.json({ status: "Ok", data: { subscribed: true } })
			}),
		)
		const queryKey = imageQueueDetailQueryKey({ path: { id: ENTRY_ID } })
		const oldRequest = QUERY_CLIENT.refetchQueries({ queryKey })
		try {
			await oldRequestStarted.promise
			await userEvent.click(follow)
			await freshRequestStarted.promise
			sendOldResponse.resolve(undefined)
			await oldRequest
			await expect(
				screen.findByRole("button", {
					name: "Unfollow submission",
					pressed: true,
				}),
			).resolves.toBeEnabled()
		} finally {
			sendOldResponse.resolve(undefined)
			await oldRequest
		}
	})

	it("keeps the comment draft independent of approval", async () => {
		expect.hasAssertions()
		const { detail, comments } = openDetail()
		const text = "Keep the uncropped cover"
		const commentAttempts: string[] = []
		const reviewAttempts: (string | null)[] = []
		let rejectReview = true
		worker.use(
			http.post(`${QUEUE_PATH}/comments`, async ({ request }) => {
				const json: unknown = await request.json()
				const { content } = v.parse(vCreateEntityCommentRequest, json)
				commentAttempts.push(content)
				const comment: Comment = {
					id: 1,
					author: REVIEWER,
					content,
					state: "Active",
					created_at: DATE,
					updated_at: DATE,
				}
				comments.push(comment)
				return HttpResponse.json({ status: "Ok", data: comment })
			}),
			http.post(QUEUE_PATH, ({ request }) => {
				reviewAttempts.push(new URL(request.url).searchParams.get("action"))
				if (rejectReview) {
					rejectReview = false
					return HttpResponse.json(
						{ message: "Review unavailable" },
						{ status: 500 },
					)
				}
				detail.status = "Approved"
				detail.handled_by = REVIEWER
				detail.handled_at = DATE
				return HttpResponse.json({ status: "Ok", message: "Approved" })
			}),
		)

		const draft = await screen.findByRole("textbox", {
			name: "Add a comment...",
		})
		await userEvent.fill(draft, text)

		const confirmation = await openApproval()
		await userEvent.click(confirmation.getByRole("button", { name: "Cancel" }))
		expect(commentAttempts).toHaveLength(0)
		expect(reviewAttempts).toHaveLength(0)
		expect(draft).toHaveValue(text)

		const firstAttempt = await openApproval()
		await userEvent.click(firstAttempt.getByRole("button", { name: "Approve" }))
		const notifications = within(
			screen.getByRole("region", { name: /Notifications/u }),
		)
		await expect(
			notifications.findByText("Review failed: Review unavailable"),
		).resolves.toBeVisible()
		expect(commentAttempts).toHaveLength(0)
		expect(reviewAttempts).toStrictEqual(["Approve"])
		expect(draft).toHaveValue(text)

		const retryApproval = await openApproval()
		await userEvent.click(
			retryApproval.getByRole("button", { name: "Approve" }),
		)
		await screen.findByRole("button", { name: "Revert" })
		expect(commentAttempts).toHaveLength(0)
		expect(reviewAttempts).toStrictEqual(["Approve", "Approve"])
		expect(draft).toHaveValue(text)

		await userEvent.click(screen.getByRole("button", { name: "Comment" }))
		await expect(screen.findByText(text)).resolves.toBeVisible()
		expect(commentAttempts).toStrictEqual([text])
		expect(reviewAttempts).toStrictEqual(["Approve", "Approve"])
		await waitFor(() => expect(draft).toHaveValue(""))
	})

	it("requires approval withdrawal confirmation and leaves the comment draft untouched", async () => {
		expect.hasAssertions()
		const { detail } = openDetail({
			status: "Approved",
			currentCover: PROPOSED,
		})
		const actions: (string | null)[] = []
		worker.use(
			http.post(QUEUE_PATH, ({ request }) => {
				actions.push(new URL(request.url).searchParams.get("action"))
				detail.status = "Reverted"
				detail.reverted_by = REVIEWER
				detail.reverted_at = DATE
				return HttpResponse.json({ status: "Ok", message: "Reverted" })
			}),
		)

		const draft = await screen.findByRole("textbox", {
			name: "Add a comment...",
		})
		await userEvent.fill(draft, "Unposted draft")
		await userEvent.click(screen.getByRole("button", { name: "Revert" }))
		const confirmation = await screen.findByRole("dialog", {
			name: "Revert the image approval for Lovelight?",
		})
		expect(actions).toHaveLength(0)
		await userEvent.click(
			within(confirmation).getByRole("button", { name: "Revert" }),
		)
		await waitFor(() =>
			expect(
				screen
					.getAllByRole("status")
					.find((status) => status.textContent === "Reverted"),
			).toBeVisible(),
		)
		expect(actions).toStrictEqual(["Revert"])
		expect(draft).toHaveValue("Unposted draft")
	})

	it("previews only the selected artwork and restores focus on close", async () => {
		expect.hasAssertions()
		await page.viewport(1100, 900)
		openDetail({ canModerate: false, currentCover: CURRENT })
		await screen.findByRole("textbox", { name: "Add a comment..." })
		expect(
			screen.queryByRole("button", { name: "Approve" }),
		).not.toBeInTheDocument()
		const current = await screen.findByRole("button", {
			name: "Enlarge image: Current",
		})
		const proposed = screen.getByRole("button", {
			name: "Enlarge image: Proposed",
		})
		expect(current.getBoundingClientRect().right).toBeLessThan(
			proposed.getBoundingClientRect().left,
		)

		await expectImagePreview(current, CURRENT, "Current")
		await expectImagePreview(proposed, PROPOSED, "Proposed")
	})

	it("does not render a submission when its detail request fails", async () => {
		expect.hasAssertions()
		const key = imageQueueDetailQueryKey({ path: { id: ENTRY_ID } })
		const defaults = QUERY_CLIENT.getQueryDefaults(key)
		QUERY_CLIENT.setQueryDefaults(key, { ...defaults, retry: false })
		try {
			openDetail()
			worker.use(
				http.get(QUEUE_PATH, () =>
					HttpResponse.json({ message: "Invalid submission" }, { status: 500 }),
				),
			)

			await expect(screen.findByRole("alert")).resolves.toBeVisible()
			expect(
				screen.queryByRole("button", { name: "Approve" }),
			).not.toBeInTheDocument()
		} finally {
			QUERY_CLIENT.setQueryDefaults(key, defaults)
		}
	})

	it("keeps the submission visible but requires a refresh before reviewing again", async () => {
		expect.hasAssertions()
		const key = imageQueueDetailQueryKey({ path: { id: ENTRY_ID } })
		const defaults = QUERY_CLIENT.getQueryDefaults(key)
		const followRefreshStarted = Promise.withResolvers<undefined>()
		const releaseFollowRefresh = Promise.withResolvers<undefined>()
		QUERY_CLIENT.setQueryDefaults(key, { ...defaults, retry: false })
		try {
			const { detail } = openDetail({ currentCover: CURRENT })
			const current = await screen.findByRole("button", {
				name: "Enlarge image: Current",
			})
			const draftName = "Add a comment..."
			const draftText = "Check the liner notes."
			await userEvent.fill(
				await screen.findByRole("textbox", { name: draftName }),
				draftText,
			)
			let failRefresh = false
			worker.use(
				http.get(QUEUE_PATH, async () => {
					if (!failRefresh) {
						return HttpResponse.json({ status: "Ok", data: detail })
					}
					if (detail.is_subscribed) {
						followRefreshStarted.resolve(undefined)
						await releaseFollowRefresh.promise
					}
					return HttpResponse.json(
						{ message: "Submission unavailable" },
						{ status: 500 },
					)
				}),
				http.post(QUEUE_PATH, () => {
					detail.status = "Approved"
					failRefresh = true
					return HttpResponse.json({ status: "Ok", message: "Approved" })
				}),
				http.post(`${QUEUE_PATH}/subscription`, () => {
					detail.is_subscribed = true
					return HttpResponse.json({ status: "Ok", data: { subscribed: true } })
				}),
			)
			const dialog = await openApproval()
			await userEvent.click(dialog.getByRole("button", { name: "Approve" }))

			await expect(screen.findByRole("alert")).resolves.toHaveTextContent(
				"Failed to refresh image queue entry.",
			)
			expect(current).toBeVisible()

			await userEvent.click(
				screen.getByRole("button", { name: "Follow submission" }),
			)
			await followRefreshStarted.promise
			expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled()

			const retry = screen.getByRole("button", { name: "Retry" })
			releaseFollowRefresh.resolve(undefined)
			await waitFor(() => expect(retry).toBeEnabled())
			failRefresh = false
			await userEvent.click(retry)
			await screen.findByRole("button", { name: "Revert" })
			expect(screen.getByRole("textbox", { name: draftName })).toHaveValue(
				draftText,
			)
		} finally {
			releaseFollowRefresh.resolve(undefined)
			QUERY_CLIENT.setQueryDefaults(key, defaults)
		}
	})

	it("uses the target included in the submission without fetching its release", async () => {
		expect.hasAssertions()
		openDetail({ currentCover: CURRENT })
		const requestedTargets: string[] = []
		worker.use(
			http.get(`*/api/release/${TARGET_ID}`, ({ request }) => {
				requestedTargets.push(request.url)
				return HttpResponse.error()
			}),
		)

		const heading = await screen.findByRole("heading", {
			level: 1,
			name: "Lovelight",
		})
		expect(within(heading).getByRole("link")).toHaveAttribute(
			"href",
			`/release/${TARGET_ID}`,
		)
		const current = screen.getByRole("button", {
			name: "Enlarge image: Current",
		})
		expect(within(current).getByRole("img")).toHaveAttribute("src", CURRENT)
		expect(requestedTargets).toHaveLength(0)
	})

	it("enlarges a wide single upload at desktop size", async () => {
		expect.hasAssertions()
		await page.viewport(1280, 900)
		openDetail()
		await screen.findByText("Add release cover")
		const proposed = screen.getByRole("button", {
			name: "Enlarge image: Proposed",
		})
		await waitFor(() => expect(proposed).toBeEnabled())
		const inlineImage = within(proposed)
			.getByRole("img")
			.getBoundingClientRect()

		await userEvent.click(proposed)
		const viewer = await screen.findByRole("dialog", { name: "Enlarged image" })
		const enlarged = within(viewer).getByRole("img").getBoundingClientRect()
		expect(Math.min(enlarged.width, enlarged.height * 4)).toBeGreaterThan(
			Math.min(inlineImage.width, inlineImage.height * 4),
		)
	})

	it("shows a single uncropped upload on a narrow screen when there is no current cover", async () => {
		expect.hasAssertions()
		await page.viewport(360, 800)
		openDetail()
		await screen.findByText("Add release cover")
		const proposed = screen.getByRole("button", {
			name: "Enlarge image: Proposed",
		})
		expect(
			screen.queryByRole("button", { name: "Enlarge image: Current" }),
		).not.toBeInTheDocument()
		await waitFor(() => expect(proposed).toBeEnabled())
		expect(proposed.getBoundingClientRect().right).toBeLessThanOrEqual(360)
		await userEvent.click(proposed)
		const viewer = await screen.findByRole("dialog", { name: "Enlarged image" })
		expect(viewer.getBoundingClientRect().right).toBeLessThanOrEqual(360)
		const image = within(viewer).getByRole("img").getBoundingClientRect()
		expect(image.width).toBeGreaterThan(0)
		expect(image.width / image.height).toBeCloseTo(4)
	})
})
