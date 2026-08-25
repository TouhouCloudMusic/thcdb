import type { Comment } from "~/hey-api"

type MockEntityCommentsOptions = {
	activeCommentCount?: number
	canManage?: boolean
	comments?: Comment[]
	errorMessage?: string
	hasMore?: boolean
	isLoadingMore?: boolean
}

async function asyncNoop() {
	await Promise.resolve()
}

export function createMockEntityComments(
	options: MockEntityCommentsOptions = {},
) {
	return {
		activeCommentCount: () =>
			options.activeCommentCount
			?? options.comments?.filter((comment) => comment.state !== "Deleted")
				.length
			?? 0,
		canManage: () => options.canManage ?? false,
		comments: () => options.comments ?? [],
		createComment: asyncNoop,
		deleteComment: asyncNoop,
		errorMessage: () => options.errorMessage,
		hasMore: () => options.hasMore ?? false,
		isLoadingMore: () => options.isLoadingMore ?? false,
		loadMore: asyncNoop,
	}
}
