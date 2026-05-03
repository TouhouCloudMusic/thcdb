import type { CorrectionComment, UserProfile } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { StoryLayout, withStoryState } from "~/utils/adapter/storybook"

import { CorrectionComments } from "./CorrectionComments"

function noop() {
	return undefined
}

async function asyncNoop() {
	await Promise.resolve()
}

const MOCK_COMMENTS: CorrectionComment[] = [
	{
		id: 1,
		correction_id: 10,
		parent_id: null,
		author: { id: 1, name: "alice" },
		content: "Could you clarify the source?",
		state: "Active",
		created_at: "2026-05-03T00:00:00Z",
		updated_at: "2026-05-03T00:00:00Z",
	},
	{
		id: 2,
		correction_id: 10,
		parent_id: 1,
		author: { id: 2, name: "bob" },
		content: "The source is listed in the liner notes.",
		state: "Active",
		created_at: "2026-05-03T01:00:00Z",
		updated_at: "2026-05-03T01:00:00Z",
	},
	{
		id: 3,
		correction_id: 10,
		parent_id: null,
		author: { id: 3, name: "carol" },
		content: "Approved, looks good.",
		state: "Active",
		created_at: "2026-05-03T02:00:00Z",
		updated_at: "2026-05-03T02:00:00Z",
	},
]

const MOCK_COMMENTS_WITH_DELETED: CorrectionComment[] = MOCK_COMMENTS.map(
	(item) =>
		item.id === 2 ? { ...item, state: "Deleted", content: undefined } : item,
)

const meta = {
	title: "View/Correction/CorrectionComments",
	component: CorrectionComments,
	decorators: [withStoryState],
	parameters: {
		layout: StoryLayout.Padded,
	},
	args: {
		comments: [],
		nextCursor: null,
		isLoadingMore: false,
		currentUser: {
			id: 1,
			name: "alice",
			last_login: new Date().toISOString(),
			stats: { song_count: 0, series_count: 0, tag_count: 0 },
		} as unknown as UserProfile,
		canManage: false,
		onLoadMore: noop,
		onCreateComment: asyncNoop,
		onDeleteComment: asyncNoop,
	},
	argTypes: {
		comments: { control: false },
		nextCursor: { control: "number" },
		isLoadingMore: { control: "boolean" },
		currentUser: { control: "object" },
		canManage: { control: "boolean" },
		onLoadMore: { control: false },
		onCreateComment: { control: false },
		onDeleteComment: { control: false },
	},
} satisfies Meta<typeof CorrectionComments>

export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
	args: {
		comments: [],
	},
}

export const WithComments: Story = {
	args: {
		comments: MOCK_COMMENTS,
	},
}

export const WithDeletedComment: Story = {
	args: {
		comments: MOCK_COMMENTS_WITH_DELETED,
	},
}

export const WithNextPage: Story = {
	args: {
		comments: MOCK_COMMENTS,
		nextCursor: 20,
	},
}
