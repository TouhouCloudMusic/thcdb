import { useQueryClient } from "@tanstack/solid-query"
import type { Label, NewCorrectionNewLabel } from "@thc/api"
import { LabelMutation, LabelQueryOption } from "@thc/query"

import { createEntityFormSubmit } from "~/view/correction/pendingCorrection"

type Props =
	| { type: "new" }
	| {
			type: "edit"
			label: Label
			pendingCorrectionId?: number
	  }

export function createLabelFormSubmission(input: Props) {
	const queryClient = useQueryClient()
	const mutation = LabelMutation.getInstance()

	return createEntityFormSubmit<Label, NewCorrectionNewLabel>({
		entityType: "label",
		mutation,
		props:
			input.type === "new"
				? input
				: {
						type: "edit",
						entity: input.label,
						pendingCorrectionId: input.pendingCorrectionId,
					},
		onCreateSuccess() {
			void queryClient.invalidateQueries({
				queryKey: [LabelQueryOption.QUERY_KEYS.DETAIL_KEYWORD],
			})
		},
		onUpdateSuccess(result) {
			void queryClient.invalidateQueries({
				queryKey: [LabelQueryOption.QUERY_KEYS.DETAIL_ID, result.entity_id],
			})
		},
	})
}
