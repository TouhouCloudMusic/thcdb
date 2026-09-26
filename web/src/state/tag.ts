import { useMutation, useQueryClient } from "@tanstack/solid-query"
import type { QueryClient } from "@tanstack/solid-query"

import type { VoteTagData } from "~/hey-api"
import {
	deleteVoteMutation,
	findTagEntitiesQueryKey,
	getTagsQueryKey,
	voteTagMutation,
} from "~/hey-api/@tanstack/solid-query.gen"

async function invalidateTagVotes(
	queryClient: QueryClient,
	path: VoteTagData["path"],
	tagId: number,
) {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: getTagsQueryKey({ path }) }),
		queryClient.invalidateQueries({
			queryKey: findTagEntitiesQueryKey({
				path: { id: tagId },
				query: { entity_type: path.entity_type },
			}),
		}),
	])
}

export function useTagVoteMutation() {
	const queryClient = useQueryClient()
	return useMutation(() => ({
		...voteTagMutation(),
		onSuccess: (_data, variables) =>
			invalidateTagVotes(queryClient, variables.path, variables.body.tag_id),
	}))
}

export function useDeleteTagVoteMutation() {
	const queryClient = useQueryClient()
	return useMutation(() => ({
		...deleteVoteMutation(),
		onSuccess: (_data, variables) =>
			invalidateTagVotes(queryClient, variables.path, variables.body.tag_id),
	}))
}
