import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/solid-query"
import type { InfiniteData } from "@tanstack/solid-query"
import { ArrExt } from "@thc/toolkit/data"
import { createMemo } from "solid-js"
import type { Accessor } from "solid-js"

import {
	hasUserPermission,
	USER_PERMISSION_NAMES,
} from "~/domain/user/constants"
import type { EntityCommentTarget, FindEntityCommentsResponse } from "~/hey-api"
import {
	createEntityCommentMutation,
	deleteCommentMutation,
	findEntityCommentsOptions,
	findEntityCommentsInfiniteOptions,
	findEntityCommentsInfiniteQueryKey,
} from "~/hey-api/@tanstack/solid-query.gen"
import { useCurrentUser } from "~/state/user"
import { getErrorMessage } from "~/utils/getErrorMessage"

export type CommentableEntityType = EntityCommentTarget

export type EntityCommentsControllerOptions = {
	entityType: CommentableEntityType
	entityId: number
	listEnabled?: boolean
}

const COMMENT_PAGE_LIMIT = 20
const COMMENT_COUNT_PAGE_LIMIT = 1

function markCommentDeleted(
	oldData: InfiniteData<FindEntityCommentsResponse> | undefined,
	commentId: number,
): InfiniteData<FindEntityCommentsResponse> | undefined {
	if (!oldData) return oldData

	const isActiveComment = oldData.pages.some((page) =>
		page.data.items.some(
			(comment) => comment.id === commentId && comment.state === "Active",
		),
	)

	return {
		...oldData,
		pages: oldData.pages.map((page) => ({
			...page,
			data: {
				...page.data,
				active_count: isActiveComment
					? Math.max(0, page.data.active_count - 1)
					: page.data.active_count,
				items: page.data.items.map((comment) =>
					comment.id === commentId
						? { ...comment, state: "Deleted" as const, content: undefined }
						: comment,
				),
			},
		})),
	}
}

export function createEntityCommentsController(
	options: Accessor<EntityCommentsControllerOptions>,
) {
	const userCtx = useCurrentUser()
	const queryClient = useQueryClient()
	const createMutation = useMutation(() => createEntityCommentMutation())
	const deleteMutation = useMutation(() => deleteCommentMutation())

	const commentsRequest = createMemo(() => ({
		path: {
			target_type: options().entityType,
			id: options().entityId,
		},
		query: {
			limit: COMMENT_PAGE_LIMIT,
		},
	}))
	const countRequest = createMemo(() => ({
		path: commentsRequest().path,
		query: {
			limit: COMMENT_COUNT_PAGE_LIMIT,
		},
	}))
	const commentsQueryKey = createMemo(() =>
		findEntityCommentsInfiniteQueryKey(commentsRequest()),
	)
	const countQuery = useQuery(() => findEntityCommentsOptions(countRequest()))
	const commentsPagesQuery = useInfiniteQuery(() => ({
		...findEntityCommentsInfiniteOptions(commentsRequest()),
		enabled: options().listEnabled ?? true,
		initialPageParam: 0 as number,
		getNextPageParam: (last) => last.data.next_cursor ?? undefined,
	}))

	const loadedPages = createMemo(() =>
		commentsPagesQuery.isSuccess ? commentsPagesQuery.data.pages : [],
	)
	const comments = createMemo(() => {
		return ArrExt.dedupeByKey(
			loadedPages().flatMap((page) => page.data.items),
			"id",
		)
	})
	const activeCommentCount = createMemo(() => {
		return (
			loadedPages()[0]?.data.active_count ?? countQuery.data?.data.active_count
		)
	})
	const hasMore = createMemo(
		() => loadedPages().at(-1)?.data.next_cursor != null,
	)
	const isInitialLoading = createMemo(
		() => commentsPagesQuery.isFetching && loadedPages().length === 0,
	)
	const isLoadingMore = createMemo(() => commentsPagesQuery.isFetchingNextPage)
	const errorMessage = createMemo(() =>
		commentsPagesQuery.isError
			? getErrorMessage(commentsPagesQuery.error)
			: undefined,
	)
	const currentUser = () => userCtx.user
	const canManage = () =>
		hasUserPermission(userCtx.user, USER_PERMISSION_NAMES.CommentManage)

	const invalidateComments = async () => {
		await queryClient.invalidateQueries({
			queryKey: [
				{
					_id: "findEntityComments",
					path: commentsRequest().path,
				},
			],
		})
	}

	const createComment = async (content: string, parentId: number | null) => {
		await createMutation.mutateAsync({
			path: commentsRequest().path,
			body: {
				content,
				parent_id: parentId,
			},
		})

		await invalidateComments()
	}

	const deleteComment = async (commentId: number) => {
		const queryKey = commentsQueryKey()
		const previousData =
			queryClient.getQueryData<InfiniteData<FindEntityCommentsResponse>>(
				queryKey,
			)
		queryClient.setQueryData<InfiniteData<FindEntityCommentsResponse>>(
			queryKey,
			(oldData) => markCommentDeleted(oldData, commentId),
		)

		try {
			await deleteMutation.mutateAsync({ path: { id: commentId } })
		} catch (error) {
			queryClient.setQueryData(queryKey, previousData)
			throw error
		}
		await invalidateComments()
	}

	const loadMore = async () => {
		if (!hasMore() || commentsPagesQuery.isFetchingNextPage) {
			return
		}
		await commentsPagesQuery.fetchNextPage()
	}

	return {
		activeCommentCount,
		canManage,
		comments,
		createComment,
		currentUser,
		deleteComment,
		errorMessage,
		hasMore,
		isInitialLoading,
		isLoadingMore,
		loadMore,
	}
}

export type EntityCommentsController = ReturnType<
	typeof createEntityCommentsController
>
