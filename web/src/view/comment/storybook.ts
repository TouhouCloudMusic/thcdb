import type { EntityComment, UserProfile } from "~/hey-api"

import type { EntityCommentsController } from "./EntityCommentsController"

type MockEntityCommentsControllerOptions = {
	activeCommentCount?: number
	canManage?: boolean
	comments?: EntityComment[]
	currentUser?: UserProfile
	errorMessage?: string
	hasMore?: boolean
	isInitialLoading?: boolean
	isLoadingMore?: boolean
}

async function asyncNoop() {
	await Promise.resolve()
}

export function createMockEntityCommentsController(
	options: MockEntityCommentsControllerOptions = {},
): EntityCommentsController {
	return {
		activeCommentCount: () =>
			options.activeCommentCount
			?? options.comments?.filter((comment) => comment.state !== "Deleted")
				.length
			?? 0,
		canManage: () => options.canManage ?? false,
		comments: () => options.comments ?? [],
		createComment: asyncNoop,
		currentUser: () => options.currentUser,
		deleteComment: asyncNoop,
		errorMessage: () => options.errorMessage,
		hasMore: () => options.hasMore ?? false,
		isInitialLoading: () => options.isInitialLoading ?? false,
		isLoadingMore: () => options.isLoadingMore ?? false,
		loadMore: asyncNoop,
	}
}
