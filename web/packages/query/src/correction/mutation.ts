import { useMutation } from "@tanstack/solid-query"
import { CorrectionApi } from "@thc/api"
import { Either } from "effect"

type CreateCommentParams = {
	correctionId: number
	content: string
	parentId?: number | null
}

export function useCreateCommentMutation() {
	return useMutation(() => ({
		mutationFn: async (params: CreateCommentParams) => {
			const result = await CorrectionApi.createComment({
				path: { id: params.correctionId },
				body: { content: params.content, parent_id: params.parentId ?? null },
			})
			return Either.match(result, {
				onRight: (data) => data,
				onLeft: (error) => {
					throw error
				},
			})
		},
	}))
}

export function useDeleteCommentMutation() {
	return useMutation(() => ({
		mutationFn: async (commentId: number) => {
			const result = await CorrectionApi.deleteComment({
				path: { id: commentId },
			})
			return Either.match(result, {
				onRight: (data) => data,
				onLeft: (error) => {
					throw error
				},
			})
		},
	}))
}
