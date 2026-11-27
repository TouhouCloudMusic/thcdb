import * as stylex from "@stylexjs/stylex"
import { useRouterState } from "@tanstack/solid-router"
import { createMemo, createSignal, Match, Show, Switch } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import type { ImageQueueDetail, UserSummary } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { StoryLayout, StoryRouterProvider } from "~/utils/adapter/storybook"
import { withStoryState } from "~/utils/adapter/storybook-state"
import { createMockEntityComments } from "~/view/comment/storybook"
import { ImageQueueDetailView } from "~/view/image_queue/detail/view"

const styles = stylex.create({
	narrow: { width: "100%", maxWidth: px[640], marginInline: "auto" },
	missing: {
		padding: px[32],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
	},
})

const STORY_REVIEWER: UserSummary = {
	id: 9001,
	name: "Aya Shameimaru",
}

const COMMENTS = createMockEntityComments()

const STORY_ENTRIES = [
	createStoryEntry({
		id: 205,
		nextId: 204,
		status: "Pending",
		createdAt: "2026-03-16T09:15:00.000Z",
		description: "The scan includes the complete front cover.",
		createdBy: {
			id: 119,
			name: "Sanae Kochiya",
		},
		image: {
			id: 805,
			url: "/img/cover/release/1.png",
			uploaded_at: "2026-03-16T09:15:00.000Z",
			uploaded_by: {
				id: 119,
				name: "Sanae Kochiya",
			},
		},
		target: {
			kind: "release",
			id: 52,
			name: "東方風神録",
			current_image_url: null,
		},
	}),
	createStoryEntry({
		id: 204,
		previousId: 205,
		nextId: 203,
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
			url: "/img/logo.png",
			uploaded_at: "2026-03-14T02:10:00.000Z",
			uploaded_by: {
				id: 120,
				name: "Maribel Hearn",
			},
		},
		target: {
			kind: "artist",
			id: 44,
			name: "Maribel Hearn",
			current_image_url: "/avatar.png",
		},
	}),
	createStoryEntry({
		id: 203,
		previousId: 204,
		nextId: 202,
		status: "Pending",
		createdAt: "2026-03-15T12:20:00.000Z",
		description: "The artist’s website has a higher-resolution portrait.",
		createdBy: {
			id: 118,
			name: "Renko Usami",
		},
		image: {
			id: 803,
			url: "/img/logo.png",
			uploaded_at: "2026-03-15T12:20:00.000Z",
			uploaded_by: {
				id: 118,
				name: "Renko Usami",
			},
		},
		target: {
			kind: "artist",
			id: 17,
			name: "Yuyuko Saigyouji",
			current_image_url: "/avatar.png",
		},
	}),
	createStoryEntry({
		id: 202,
		previousId: 203,
		nextId: 201,
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
			url: "/avatar.png",
			uploaded_at: "2026-03-13T17:00:00.000Z",
			uploaded_by: {
				id: 116,
				name: "Keine Kamishirasawa",
			},
		},
		target: {
			kind: "release",
			id: 31,
			name: "Perfect Memento in Strict Sense",
			current_image_url: "/img/logo.png",
		},
	}),
	createStoryEntry({
		id: 201,
		previousId: 202,
		status: "Rejected",
		createdAt: "2026-03-12T05:40:00.000Z",
		createdBy: {
			id: 114,
			name: "Kogasa Tatara",
		},
		handledAt: "2026-03-12T07:05:00.000Z",
		handledBy: STORY_REVIEWER,
		image: null,
		target: {
			kind: "release",
			id: 30,
			name: "Undefined Fantastic Object",
			current_image_url: null,
		},
	}),
] satisfies StoryEntry[]

const STATUS_OPTIONS = ["Pending", "Approved", "Rejected", "Reverted"] as const

type StoryStatus = (typeof STATUS_OPTIONS)[number]

type StoryEntry = {
	detail: ImageQueueDetail
}

type StoryEntrySeed = {
	id: number
	previousId?: number
	nextId?: number
	status: ImageQueueDetail["status"]
	createdAt: string
	description?: string
	createdBy: UserSummary
	handledAt?: string | null
	handledBy?: UserSummary | null
	revertedAt?: string | null
	revertedBy?: UserSummary | null
	image: ImageQueueDetail["image"]
	target: ImageQueueDetail["target"]
}

type StoryRootProps = {
	status: StoryStatus
	firstUpload: boolean
}

function createStoryEntry(seed: StoryEntrySeed): StoryEntry {
	return {
		detail: {
			id: seed.id,
			previous_id: seed.previousId ?? null,
			next_id: seed.nextId ?? null,
			image_id: seed.image?.id ?? null,
			status: seed.status,
			created_at: seed.createdAt,
			description: seed.description ?? null,
			created_by: seed.createdBy,
			handled_at: seed.handledAt ?? null,
			handled_by: seed.handledBy ?? null,
			reverted_at: seed.revertedAt ?? null,
			reverted_by: seed.revertedBy ?? null,
			image: seed.image,
			target: seed.target,
			is_subscribed: false,
		},
	}
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
	const entryId = /^\/image-queue\/(?<entryId>\d+)$/u.exec(pathname)?.groups?.[
		"entryId"
	]
	if (entryId === undefined) return fallback

	const value = Number(entryId)
	return Number.isFinite(value) ? value : fallback
}

function findEntry(entries: StoryEntry[], id: number) {
	return entries.find((entry) => entry.detail.id === id)
}

function updateStoryEntry(
	entry: StoryEntry,
	action: "Approve" | "Reject" | "Revert",
): StoryEntry {
	const handledAt = "2026-03-17T09:30:00.000Z"
	const revertedAt = "2026-03-17T09:45:00.000Z"

	switch (action) {
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
	action: "Approve" | "Reject" | "Revert",
) {
	return entries.map((entry) =>
		entry.detail.id === entryId ? updateStoryEntry(entry, action) : entry,
	)
}

function StoryRoot(props: StoryRootProps) {
	const initialEntry = () =>
		props.status === "Pending" && props.firstUpload
			? 205
			: getInitialEntryId(props.status)
	return (
		<Show
			when={initialEntry()}
			keyed
		>
			{(id) => (
				<StoryRouterProvider initialEntry={`/image-queue/${id}`}>
					<StoryScene initialEntryId={id} />
				</StoryRouterProvider>
			)}
		</Show>
	)
}

function StoryScene(props: { initialEntryId: number }) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	})
	const [storyEntries, setStoryEntries] = createSignal(createStoryState())

	const currentEntryId = createMemo(() =>
		parseEntryId(pathname(), props.initialEntryId),
	)
	const currentEntry = createMemo(() =>
		findEntry(storyEntries(), currentEntryId()),
	)

	const updateCurrentEntry = (action: "Approve" | "Reject" | "Revert") => {
		setStoryEntries((entries) =>
			updateStoryEntries(entries, currentEntryId(), action),
		)
	}
	const toggleSubscription = () => {
		const id = currentEntryId()
		setStoryEntries((entries) =>
			entries.map((entry) =>
				entry.detail.id === id
					? {
							...entry,
							detail: {
								...entry.detail,
								is_subscribed: !entry.detail.is_subscribed,
							},
						}
					: entry,
			),
		)
	}

	return (
		<Switch>
			<Match when={currentEntry()}>
				{(entry) => (
					<ImageQueueDetailView
						detail={entry().detail}
						review={{
							targetName: entry().detail.target.name,
							disabled: false,
							onModerate: updateCurrentEntry,
						}}
						comments={COMMENTS}
						subscription={{
							isSubscribed: entry().detail.is_subscribed,
							disabled: false,
							toggle: toggleSubscription,
						}}
					/>
				)}
			</Match>
			<Match when={true}>
				<div {...stylex.attrs(styles.missing)}>Story entry not found.</div>
			</Match>
		</Switch>
	)
}

const meta = {
	title: "Page/ImageQueueDetailPage",
	component: StoryRoot,
	decorators: [withStoryState],
	parameters: {
		layout: StoryLayout.FullScreen,
	},
	argTypes: {
		status: {
			control: { type: "radio" },
			options: STATUS_OPTIONS,
		},
		firstUpload: {
			control: "boolean",
			if: { arg: "status", eq: "Pending" },
		},
	},
	args: {
		status: "Pending",
		firstUpload: false,
	},
} satisfies Meta<typeof StoryRoot>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		status: "Pending",
	},
}

export const Narrow: Story = {
	render: (args: StoryRootProps) => (
		<div {...stylex.attrs(styles.narrow)}>
			<StoryRoot {...args} />
		</div>
	),
}
