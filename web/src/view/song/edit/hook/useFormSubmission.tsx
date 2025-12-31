import { useNavigate } from "@tanstack/solid-router"
import type { Song } from "@thc/api"
import { SongMutation } from "@thc/query"
import type { InferOutput } from "valibot"

import type { NewSongCorrection } from "~/domain/song"

type Props =
	| {
			type: "new"
	  }
	| {
			type: "edit"
			song: Song
	  }

export function useSongFormSubmission(props: Props) {
	const navigator = useNavigate()
	const mutation = SongMutation.getInstance()

	const handleSubmit = (output: InferOutput<typeof NewSongCorrection>) => {
		if (props.type === "new") {
			mutation.mutate(
				{ type: "Create", data: output },
				{
					onSuccess(result) {
						void navigator({ to: `/correction/${result.correction_id}` })
					},
					onError(error) {
						if (import.meta.env.DEV) {
							console.error("Failed to create song:", error)
						}
					},
				},
			)
			return
		}

		mutation.mutate(
			{ type: "Update", id: props.song.id, data: output },
			{
				onSuccess(result) {
					void navigator({ to: `/correction/${result.correction_id}` })
				},
				onError(error) {
					if (import.meta.env.DEV) {
						console.error("Failed to update song:", error)
					}
				},
			},
		)
	}

	return { handleSubmit }
}
