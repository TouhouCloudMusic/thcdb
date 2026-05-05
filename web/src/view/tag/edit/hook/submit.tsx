import { useQueryClient } from "@tanstack/solid-query"
import type { NewCorrectionNewTag, Tag } from "@thc/api"
import { TagMutation, TagQueryOption } from "@thc/query"

import { createEntityFormSubmit } from "~/view/correction/pendingCorrection"

type Props =
	| { type: "new" }
	| { type: "edit"; tag: Tag; pendingCorrectionId?: number }

export function createTagFormSubmission(input: Props) {
	const queryClient = useQueryClient()
	const mutation = TagMutation.getInstance()

	return createEntityFormSubmit<Tag, NewCorrectionNewTag>({
		entityType: "tag",
		mutation,
		props:
			input.type === "new"
				? input
				: {
						type: "edit",
						entity: input.tag,
						pendingCorrectionId: input.pendingCorrectionId,
					},
		onCreateSuccess() {
			void queryClient.invalidateQueries({
				queryKey: [TagQueryOption.QUERY_KEYS.DETAIL_KEYWORD],
			})
		},
		onUpdateSuccess(result) {
			void queryClient.invalidateQueries({
				queryKey: [TagQueryOption.QUERY_KEYS.DETAIL_ID, result.entity_id],
			})
		},
	})
}
