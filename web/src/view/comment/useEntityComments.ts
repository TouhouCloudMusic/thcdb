import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/solid-query"
import type { InfiniteData } from "@tanstack/solid-query"
import { ArrExt } from "@thc/toolkit/data"
import { produce } from "immer"
import type { Accessor } from "solid-js"

import { hasUserPermission } from "~/domain/user/authorization"
import { USER_PERMISSION_NAMES } from "~/domain/user/constants"
import type {
	Comment,
	CommentPage,
	EntityCommentTarget,
	FindEntityCommentsResponse,
} from "~/hey-api"
import {
	createEntityCommentMutation,
	deleteCommentMutation,
	findEntityCommentsOptions,
	findEntityCommentsInfiniteOptions,
	findEntityCommentsInfiniteQueryKey,
	findEntityCommentsQueryKey,
} from "~/hey-api/@tanstack/solid-query.gen"
import { useCurrentUser } from "~/state/user"
import { getErrorMessage } from "~/utils/getErrorMessage"

import type { EntityCommentsModel } from "./EntityComments"

export type UseEntityCommentsOptions = {
	entityType: EntityCommentTarget
	entityId: number
	initialPage?: {
		data: CommentPage
		updatedAt: number
	}
	listEnabled?: boolean
}

const COMMENT_PAGE_LIMIT = 20
const COMMENT_COUNT_PAGE_LIMIT = 1

export function useEntityComments(
	options: Accessor<UseEntityCommentsOptions>,
): EntityCommentsModel {
	const userCtx = useCurrentUser()
	const queryClient = useQueryClient()
	const createMutation = useMutation(createEntityCommentMutation)
	const deleteMutation = useMutation(deleteCommentMutation)

	const commentsRequest = () => ({
		path: {
			target_type: options().entityType,
			id: options().entityId,
		},
		query: {
			limit: COMMENT_PAGE_LIMIT,
		},
	})
	const countRequest = () => ({
		path: commentsRequest().path,
		query: {
			limit: COMMENT_COUNT_PAGE_LIMIT,
		},
	})

	const countQuery = useQuery(() => ({
		...findEntityCommentsOptions(countRequest()),
		enabled: options().initialPage == null,
	}))

	const commentsOptions = () => ({
		...findEntityCommentsInfiniteOptions(commentsRequest()),
		enabled: options().listEnabled ?? true,
		initialPageParam: 0 as number,
		getNextPageParam: (last: FindEntityCommentsResponse) =>
			last.data.next_cursor ?? undefined,
	})

	const initialPage = options().initialPage
	const commentsPagesQuery = initialPage
		? useInfiniteQuery(() => ({
				...commentsOptions(),
				initialData: {
					pages: [{ status: "Ok", data: initialPage.data }],
					pageParams: [0],
				},
				initialDataUpdatedAt: initialPage.updatedAt,
			}))
		: useInfiniteQuery(commentsOptions)

	const loadedPages = () => commentsPagesQuery.data?.pages ?? []
	const comments = () =>
		ArrExt.dedupeByKey(
			loadedPages().flatMap((page) => page.data.items),
			"id",
		).sort((left, right) => left.id - right.id)

	return {
		activeCommentCount() {
			return initialPage
				? loadedPages()[0]?.data.active_count
				: countQuery.data?.data.active_count
		},
		canManage() {
			return hasUserPermission(
				userCtx.authorization,
				USER_PERMISSION_NAMES.CommentManage,
			)
		},
		comments,
		async createComment(content, inReplyToCommentId) {
			if (commentsPagesQuery.isPending || !commentsPagesQuery.data) {
				await commentsPagesQuery.refetch({ throwOnError: true })
			}

			const path = commentsRequest().path
			const queryKey = findEntityCommentsInfiniteQueryKey(commentsRequest())
			const countQueryKey = findEntityCommentsQueryKey(countRequest())

			const readThroughCommentId = comments().findLast(
				(comment) => comment.author.id !== userCtx.profile?.id,
			)?.id

			const addCreatedCommentToCache = userCtx.bindCurrentSession(
				(comment: Comment) => {
					queryClient.setQueryData<InfiniteData<FindEntityCommentsResponse>>(
						queryKey,
						(data) => {
							if (
								!data
								|| data.pages.length === 0
								|| data.pages.some((page) =>
									page.data.items.some((item) => item.id === comment.id),
								)
							) {
								return data
							}

							return produce(data, (draft) => {
								for (const page of draft.pages) {
									page.data.active_count += 1
								}

								draft.pages.at(-1)!.data.items.push(comment)
							})
						},
					)
				},
			)

			const response = await createMutation.mutateAsync({
				path,
				body: {
					content,
					in_reply_to_comment_id: inReplyToCommentId,
					read_through_comment_id: readThroughCommentId,
				},
			})

			addCreatedCommentToCache(response.data)

			void queryClient.invalidateQueries({
				queryKey: countQueryKey,
				exact: true,
			})
		},
		async deleteComment(commentId) {
			const queryKey = findEntityCommentsInfiniteQueryKey(commentsRequest())
			const countQueryKey = findEntityCommentsQueryKey(countRequest())

			await deleteMutation.mutateAsync({ path: { id: commentId } })

			queryClient.setQueryData<InfiniteData<FindEntityCommentsResponse>>(
				queryKey,
				(data) => {
					if (!data) return data

					const isActiveComment = data.pages.some((page) =>
						page.data.items.some(
							(comment) =>
								comment.id === commentId && comment.state === "Active",
						),
					)

					return produce(data, (draft) => {
						for (const page of draft.pages) {
							if (isActiveComment) {
								page.data.active_count = Math.max(0, page.data.active_count - 1)
							}

							for (const comment of page.data.items) {
								if (comment.id !== commentId) continue

								comment.state = "Deleted"
								comment.content = undefined
							}
						}
					})
				},
			)

			void queryClient.invalidateQueries({
				queryKey: countQueryKey,
				exact: true,
			})
		},
		errorMessage() {
			return commentsPagesQuery.isError
				? getErrorMessage(commentsPagesQuery.error)
				: undefined
		},
		hasMore() {
			return commentsPagesQuery.hasNextPage
		},
		isLoadingMore() {
			return commentsPagesQuery.isFetchingNextPage
		},
		async loadMore() {
			if (
				!commentsPagesQuery.hasNextPage
				|| commentsPagesQuery.isFetchingNextPage
			) {
				return
			}

			await commentsPagesQuery.fetchNextPage()
		},
	}
}
