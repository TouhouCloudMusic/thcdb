import type { NewCorrectionNewRelease, Release } from "@thc/api"
import { ReleaseMutation } from "@thc/query"

import { createEntityFormSubmit } from "~/view/correction/pendingCorrection"

type Props =
	| { type: "new" }
	| { type: "edit"; release: Release; pendingCorrectionId?: number }

export function useReleaseFormSubmission(input: Props) {
	const mutation = ReleaseMutation.getInstance()

	return createEntityFormSubmit<Release, NewCorrectionNewRelease>({
		entityType: "release",
		mutation,
		props:
			input.type === "new"
				? input
				: {
						type: "edit",
						entity: input.release,
						pendingCorrectionId: input.pendingCorrectionId,
					},
	})
}
