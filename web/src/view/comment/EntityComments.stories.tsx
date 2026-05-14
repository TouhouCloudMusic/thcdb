import type { Meta, StoryObj } from "storybook-solidjs-vite"

import type { EntityComment, UserProfile } from "~/hey-api"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { EntityComments } from "./EntityComments"
import type { EntityCommentsController } from "./EntityCommentsController"

async function asyncNoop() {
	await Promise.resolve()
}

const MOCK_COMMENTS: EntityComment[] = [
	{
		id: 1,
		parent_id: null,
		author: { id: 1, name: "alice" },
		content: "Could you clarify the source?",
		state: "Active",
		created_at: "2026-05-03T00:00:00Z",
		updated_at: "2026-05-03T00:00:00Z",
	},
	{
		id: 2,
		parent_id: 1,
		author: { id: 2, name: "bob" },
		content: "The source is listed in the liner notes.",
		state: "Active",
		created_at: "2026-05-03T01:00:00Z",
		updated_at: "2026-05-03T01:00:00Z",
	},
	{
		id: 3,
		parent_id: null,
		author: { id: 3, name: "carol" },
		content: "Approved, looks good.",
		state: "Active",
		created_at: "2026-05-03T02:00:00Z",
		updated_at: "2026-05-03T02:00:00Z",
	},
]

const MOCK_COMMENTS_WITH_DELETED: EntityComment[] = MOCK_COMMENTS.map((item) =>
	item.id === 2 ? { ...item, state: "Deleted", content: undefined } : item,
)

type MockControllerOptions = {
	comments: EntityComment[]
	hasMore: boolean
	isInitialLoading: boolean
	isLoadingMore: boolean
	errorMessage?: string
	currentUser: UserProfile | undefined
	canManage: boolean
}

const CURRENT_USER = {
	name: "alice",
	last_login: new Date().toISOString(),
	stats: { edit_count: 0, vote_count: 0 },
} satisfies UserProfile

function mockController(
	options: MockControllerOptions,
): EntityCommentsController {
	return {
		activeCommentCount: () =>
			options.comments.filter((comment) => comment.state !== "Deleted").length,
		canManage: () => options.canManage,
		comments: () => options.comments,
		createComment: asyncNoop,
		currentUser: () => options.currentUser,
		deleteComment: asyncNoop,
		errorMessage: () => options.errorMessage,
		hasMore: () => options.hasMore,
		isInitialLoading: () => options.isInitialLoading,
		isLoadingMore: () => options.isLoadingMore,
		loadMore: asyncNoop,
	}
}

const EMPTY_CONTROLLER = mockController({
	comments: [],
	hasMore: false,
	isInitialLoading: false,
	isLoadingMore: false,
	currentUser: CURRENT_USER,
	canManage: false,
})

const meta = {
	title: "View/Comment/EntityComments",
	component: EntityComments,
	decorators: [withStoryRouter],
	parameters: {
		layout: StoryLayout.Padded,
	},
	args: {
		controller: EMPTY_CONTROLLER,
	},
	argTypes: {
		controller: { control: false },
	},
} satisfies Meta<typeof EntityComments>

export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
	args: {
		controller: EMPTY_CONTROLLER,
	},
}

export const Loading: Story = {
	args: {
		controller: mockController({
			comments: [],
			hasMore: false,
			isInitialLoading: true,
			isLoadingMore: false,
			currentUser: CURRENT_USER,
			canManage: false,
		}),
	},
}

export const Error: Story = {
	args: {
		controller: mockController({
			comments: [],
			hasMore: false,
			isInitialLoading: false,
			isLoadingMore: false,
			errorMessage: "Failed to load comments",
			currentUser: CURRENT_USER,
			canManage: false,
		}),
	},
}

export const WithComments: Story = {
	args: {
		controller: mockController({
			comments: MOCK_COMMENTS,
			hasMore: false,
			isInitialLoading: false,
			isLoadingMore: false,
			currentUser: CURRENT_USER,
			canManage: false,
		}),
	},
}

export const WithDeletedComment: Story = {
	args: {
		controller: mockController({
			comments: MOCK_COMMENTS_WITH_DELETED,
			hasMore: false,
			isInitialLoading: false,
			isLoadingMore: false,
			currentUser: CURRENT_USER,
			canManage: false,
		}),
	},
}

export const WithNextPage: Story = {
	args: {
		controller: mockController({
			comments: MOCK_COMMENTS,
			hasMore: true,
			isInitialLoading: false,
			isLoadingMore: false,
			currentUser: CURRENT_USER,
			canManage: false,
		}),
	},
}
