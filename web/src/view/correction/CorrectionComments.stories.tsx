import type { Meta, StoryObj } from "storybook-solidjs-vite"

import type { Comment } from "~/hey-api"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { createMockEntityComments } from "~/view/comment/storybook"

import { CorrectionComments } from "./CorrectionComments"

const MOCK_COMMENTS: Comment[] = [
	{
		id: 1,
		in_reply_to_comment_id: null,
		author: { id: 1, name: "alice" },
		content: "Could you clarify the source?",
		state: "Active",
		created_at: "2026-05-03T00:00:00Z",
		updated_at: "2026-05-03T00:00:00Z",
	},
	{
		id: 2,
		in_reply_to_comment_id: 1,
		author: { id: 2, name: "bob" },
		content: "The source is listed in the liner notes.",
		state: "Active",
		created_at: "2026-05-03T01:00:00Z",
		updated_at: "2026-05-03T01:00:00Z",
	},
	{
		id: 3,
		in_reply_to_comment_id: null,
		author: { id: 3, name: "carol" },
		content: "Approved, looks good.",
		state: "Active",
		created_at: "2026-05-03T02:00:00Z",
		updated_at: "2026-05-03T02:00:00Z",
	},
]

const MOCK_COMMENTS_WITH_DELETED: Comment[] = MOCK_COMMENTS.map((item) =>
	item.id === 2 ? { ...item, state: "Deleted", content: undefined } : item,
)

const meta = {
	title: "View/Correction/CorrectionComments",
	component: CorrectionComments,
	decorators: [withStoryRouter],
	parameters: {
		layout: StoryLayout.Padded,
	},
	args: {
		model: createMockEntityComments(),
	},
	argTypes: {
		model: { control: false },
	},
} satisfies Meta<typeof CorrectionComments>

export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
	args: {
		model: createMockEntityComments(),
	},
}

export const Error: Story = {
	args: {
		model: createMockEntityComments({
			errorMessage: "Failed to load comments",
		}),
	},
}

export const WithComments: Story = {
	args: {
		model: createMockEntityComments({
			comments: MOCK_COMMENTS,
		}),
	},
}

export const WithDeletedComment: Story = {
	args: {
		model: createMockEntityComments({
			comments: MOCK_COMMENTS_WITH_DELETED,
		}),
	},
}

export const WithNextPage: Story = {
	args: {
		model: createMockEntityComments({
			comments: MOCK_COMMENTS,
			hasMore: true,
		}),
	},
}
