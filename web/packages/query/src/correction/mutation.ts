import { useMutation } from "@tanstack/solid-query"
import type { CorrectionSubmitResult as ApiCorrectionSubmitResult } from "@thc/api"
import { CorrectionApi } from "@thc/api"
import { Either } from "effect"

export type CorrectionSubmitResult = ApiCorrectionSubmitResult

export type EntityCorrectionMutationParams<TData> =
	| { type: "Create"; data: TData }
	| {
			type: "Update"
			id: number
			correctionId?: number
			data: TData
	  }

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
