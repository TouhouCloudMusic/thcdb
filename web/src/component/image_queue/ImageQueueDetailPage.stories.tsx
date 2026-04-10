import { QueryClient } from "@tanstack/solid-query"
import {
	createMemoryHistory,
	createRouter,
	RouterContextProvider,
} from "@tanstack/solid-router"
import type { Artist, ImageQueueDetail, Release, UserSummary } from "@thc/api"
import {
	createMemo,
	createSignal,
	Match,
	Show,
	Switch,
	untrack,
} from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { routeTree } from "~/routeTree.gen"
import { imgUrl } from "~/utils/adapter/static_file"
import { StoryLayout } from "~/utils/adapter/storybook"
import { ImageQueueDetailPageContent } from "~/view/image_queue/detail"

const STORY_REVIEWER: UserSummary = {
	id: 9001,
	name: "Aya Shameimaru",
}

const STORY_ENTRIES = [
	createStoryEntry({
		id: 205,
		status: "Pending",
		createdAt: "2026-03-16T09:15:00.000Z",
		createdBy: {
			id: 119,
			name: "Sanae Kochiya",
		},
		image: {
			id: 805,
			filename: "/img/logo.png",
			directory: "",
			uploaded_at: "2026-03-16T09:15:00.000Z",
			uploaded_by: {
				id: 119,
				name: "Sanae Kochiya",
			},
		},
		release: {
			release_id: 52,
			type: "Cover",
		},
		targetRelease: {
			id: 52,
			title: "東方風神録",
			release_type: "Album",
			cover_art_url: "/img/logo.png",
		},
	}),
	createStoryEntry({
		id: 204,
		status: "Reverted",
		createdAt: "2026-03-14T02:10:00.000Z",
		createdBy: {
			id: 120,
			name: "Maribel Hearn",
		},
		handledAt: "2026-03-14T08:25:00.000Z",
		handledBy: STORY_REVIEWER,
		revertedAt: "2026-03-15T03:45:00.000Z",
		revertedBy: STORY_REVIEWER,
		image: {
			id: 804,
			filename: "/img/logo.png",
			directory: "",
			uploaded_at: "2026-03-14T02:10:00.000Z",
			uploaded_by: {
				id: 120,
				name: "Maribel Hearn",
			},
		},
		artist: {
			artist_id: 44,
			type: "Profile",
		},
		targetArtist: {
			id: 44,
			name: "Maribel Hearn",
			artist_type: "Solo",
			profile_image_url: "/avatar.png",
		},
	}),
	createStoryEntry({
		id: 203,
		status: "Pending",
		createdAt: "2026-03-15T12:20:00.000Z",
		createdBy: {
			id: 118,
			name: "Renko Usami",
		},
		image: {
			id: 803,
			filename: "/img/logo.png",
			directory: "",
			uploaded_at: "2026-03-15T12:20:00.000Z",
			uploaded_by: {
				id: 118,
				name: "Renko Usami",
			},
		},
		artist: {
			artist_id: 17,
			type: "Profile",
		},
		targetArtist: {
			id: 17,
			name: "Yuyuko Saigyouji",
			artist_type: "Solo",
			profile_image_url: "/avatar.png",
		},
	}),
	createStoryEntry({
		id: 202,
		status: "Approved",
		createdAt: "2026-03-13T17:00:00.000Z",
		createdBy: {
			id: 116,
			name: "Keine Kamishirasawa",
		},
		handledAt: "2026-03-13T18:30:00.000Z",
		handledBy: STORY_REVIEWER,
		image: {
			id: 802,
			filename: "/avatar.png",
			directory: "",
			uploaded_at: "2026-03-13T17:00:00.000Z",
			uploaded_by: {
				id: 116,
				name: "Keine Kamishirasawa",
			},
		},
		release: {
			release_id: 31,
			type: "Cover",
		},
		targetRelease: {
			id: 31,
			title: "Perfect Memento in Strict Sense",
			release_type: "Album",
			cover_art_url: "/img/logo.png",
		},
	}),
	createStoryEntry({
		id: 201,
		status: "Rejected",
		createdAt: "2026-03-12T05:40:00.000Z",
		createdBy: {
			id: 114,
			name: "Kogasa Tatara",
		},
		handledAt: "2026-03-12T07:05:00.000Z",
		handledBy: STORY_REVIEWER,
		image: null,
		release: {
			release_id: 30,
			type: "Cover",
		},
		targetRelease: {
			id: 30,
			title: "Undefined Fantastic Object",
			release_type: "Album",
			cover_art_url: null,
		},
	}),
] satisfies StoryEntry[]

const STATUS_OPTIONS = ["Pending", "Approved", "Rejected", "Reverted"] as const

type StoryStatus = (typeof STATUS_OPTIONS)[number]

type StoryEntry = {
	detail: ImageQueueDetail
	targetArtist?: Artist
	targetRelease?: Release
}

type StoryEntrySeed = {
	id: number
	status: ImageQueueDetail["status"]
	createdAt: string
	createdBy: UserSummary
	handledAt?: string | null
	handledBy?: UserSummary | null
	revertedAt?: string | null
	revertedBy?: UserSummary | null
	image: ImageQueueDetail["image"]
	artist?: NonNullable<ImageQueueDetail["artist"]>
	release?: NonNullable<ImageQueueDetail["release"]>
	targetArtist?: Artist
	targetRelease?: Release
}

type StoryRootProps = {
	status: StoryStatus
}

function createStoryEntry(seed: StoryEntrySeed): StoryEntry {
	return {
		detail: {
			id: seed.id,
			image_id: seed.image?.id ?? null,
			status: seed.status,
			created_at: seed.createdAt,
			created_by: seed.createdBy,
			handled_at: seed.handledAt ?? null,
			handled_by: seed.handledBy ?? null,
			reverted_at: seed.revertedAt ?? null,
			reverted_by: seed.revertedBy ?? null,
			image: seed.image,
			artist: seed.artist ?? null,
			release: seed.release ?? null,
		},
		targetArtist: seed.targetArtist,
		targetRelease: seed.targetRelease,
	}
}

function createStoryQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: Number.POSITIVE_INFINITY,
				retry: false,
			},
			mutations: {
				retry: false,
			},
		},
	})
}

function createStoryRouter(queryClient: QueryClient, initialEntryId: number) {
	return createRouter({
		routeTree,
		history: createMemoryHistory({
			initialEntries: [`/image-queue/${initialEntryId}`],
		}),
		context: {
			queryClient,
		},
		defaultPreloadStaleTime: 0,
	})
}

function createStoryState() {
	return structuredClone(STORY_ENTRIES)
}

function getInitialEntryId(status: StoryStatus) {
	switch (status) {
		case "Pending": {
			return 203
		}
		case "Approved": {
			return 202
		}
		case "Rejected": {
			return 201
		}
		case "Reverted": {
			return 204
		}
	}
}

function parseEntryId(pathname: string, fallback: number) {
	const match = /^\/image-queue\/(\d+)$/.exec(pathname)
	if (!match) return fallback

	const value = Number(match[1])
	return Number.isFinite(value) ? value : fallback
}

function findEntry(entries: StoryEntry[], id: number) {
	return entries.find((entry) => entry.detail.id === id)
}

function getTargetName(entry: StoryEntry) {
	return entry.targetArtist?.name ?? entry.targetRelease?.title
}

function getCurrentImageSrc(entry: StoryEntry) {
	const url =
		entry.targetArtist?.profile_image_url ?? entry.targetRelease?.cover_art_url
	return imgUrl(url)
}

function getCachedNeighbor(entries: StoryEntry[], entryId: number) {
	const ids = entries.map((entry) => entry.detail.id).toSorted((a, b) => b - a)
	const index = ids.indexOf(entryId)
	if (index === -1) return

	return {
		prev: ids[index - 1],
		next: ids[index + 1],
	}
}

function updateStoryEntry(
	entry: StoryEntry,
	method: "Approve" | "Reject" | "Revert",
): StoryEntry {
	const handledAt = "2026-03-17T09:30:00.000Z"
	const revertedAt = "2026-03-17T09:45:00.000Z"

	switch (method) {
		case "Approve": {
			return {
				...entry,
				detail: {
					...entry.detail,
					status: "Approved",
					handled_at: handledAt,
					handled_by: STORY_REVIEWER,
				},
			}
		}
		case "Reject": {
			return {
				...entry,
				detail: {
					...entry.detail,
					status: "Rejected",
					handled_at: handledAt,
					handled_by: STORY_REVIEWER,
				},
			}
		}
		case "Revert": {
			return {
				...entry,
				detail: {
					...entry.detail,
					status: "Reverted",
					reverted_at: revertedAt,
					reverted_by: STORY_REVIEWER,
				},
			}
		}
	}
}

function updateStoryEntries(
	entries: StoryEntry[],
	entryId: number,
	method: "Approve" | "Reject" | "Revert",
) {
	return entries.map((entry) =>
		entry.detail.id === entryId ? updateStoryEntry(entry, method) : entry,
	)
}

function StoryRoot(props: StoryRootProps) {
	return (
		<Show
			when={props.status}
			keyed
		>
			{(status) => <StoryScene status={status} />}
		</Show>
	)
}

function StoryScene(props: StoryRootProps) {
	const queryClient = createStoryQueryClient()
	const initialEntryId = untrack(() => getInitialEntryId(props.status))
	const router = createStoryRouter(queryClient, initialEntryId)
	const [storyEntries, setStoryEntries] = createSignal(createStoryState())

	const currentEntryId = createMemo(() =>
		parseEntryId(router.state.location.pathname, initialEntryId),
	)
	const currentEntry = createMemo(() =>
		findEntry(storyEntries(), currentEntryId()),
	)

	const updateCurrentEntry = (method: "Approve" | "Reject" | "Revert") => {
		setStoryEntries((entries) =>
			updateStoryEntries(entries, currentEntryId(), method),
		)
	}

	return (
		<RouterContextProvider router={router}>
			{() => (
				<Switch>
					<Match when={currentEntry()}>
						{(entry) => (
							<ImageQueueDetailPageContent
								detail={entry().detail}
								isLoading={false}
								isError={false}
								canManage={true}
								isBusy={false}
								backLink={{
									to: "/image-queue",
									search: { status: "pending" },
								}}
								onApprove={() => updateCurrentEntry("Approve")}
								onReject={() => updateCurrentEntry("Reject")}
								onRevert={() => updateCurrentEntry("Revert")}
								cachedNeighbor={getCachedNeighbor(
									storyEntries(),
									entry().detail.id,
								)}
								targetName={getTargetName(entry())}
								currentSrc={getCurrentImageSrc(entry())}
								currentLoading={false}
								currentError={false}
							/>
						)}
					</Match>
					<Match when={true}>
						<div class="p-8 text-sm text-slate-500">Story entry not found.</div>
					</Match>
				</Switch>
			)}
		</RouterContextProvider>
	)
}

const meta = {
	title: "Page/ImageQueueDetailPage",
	component: StoryRoot,
	parameters: {
		layout: StoryLayout.FullScreen,
	},
	argTypes: {
		status: {
			control: { type: "radio" },
			options: STATUS_OPTIONS,
		},
	},
	args: {
		status: "Pending",
	},
} satisfies Meta<typeof StoryRoot>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		status: "Pending",
	},
}
