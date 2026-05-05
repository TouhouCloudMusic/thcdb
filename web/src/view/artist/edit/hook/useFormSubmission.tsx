import type { Artist, NewCorrectionNewArtist } from "@thc/api"
import { ArtistMutation } from "@thc/query"

import { createEntityFormSubmit } from "~/view/correction/pendingCorrection"

type Props =
	| { type: "new" }
	| { type: "edit"; artist: Artist; pendingCorrectionId?: number }

export function useArtistFormSubmission(input: Props) {
	const mutation = ArtistMutation.getInstance()

	return createEntityFormSubmit<Artist, NewCorrectionNewArtist>({
		entityType: "artist",
		mutation,
		props:
			input.type === "new"
				? input
				: {
						type: "edit",
						entity: input.artist,
						pendingCorrectionId: input.pendingCorrectionId,
					},
		onError(_error, type) {
			if (type === "update") return false
		},
	})
}
