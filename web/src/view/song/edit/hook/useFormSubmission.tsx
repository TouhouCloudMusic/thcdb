import type { NewCorrectionNewSong, Song } from "@thc/api"
import { SongMutation } from "@thc/query"

import { createEntityFormSubmit } from "~/view/correction/pendingCorrection"

type Props =
	| { type: "new" }
	| { type: "edit"; song: Song; pendingCorrectionId?: number }

export function useSongFormSubmission(input: Props) {
	const mutation = SongMutation.getInstance()

	return createEntityFormSubmit<Song, NewCorrectionNewSong>({
		entityType: "song",
		mutation,
		props:
			input.type === "new"
				? input
				: {
						type: "edit",
						entity: input.song,
						pendingCorrectionId: input.pendingCorrectionId,
					},
	})
}
