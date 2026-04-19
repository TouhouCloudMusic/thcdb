import { useNavigate } from "@tanstack/solid-router"
import type { Artist } from "@thc/api"
import { ArtistMutation } from "@thc/query"
import type { InferOutput } from "valibot"

import type { NewArtistCorrection } from "~/domain/artist/schema"

type Props =
	| {
			type: "new"
	  }
	| {
			type: "edit"
			artist: Artist
	  }

export function useArtistFormSubmission(props: Props) {
	const navigator = useNavigate()
	const mutation = ArtistMutation.getInstance()

	const handleSubmit = (output: InferOutput<typeof NewArtistCorrection>) => {
		if (props.type == "new") {
			mutation.mutate(
				{ type: "Create", data: output },
				{
					onSuccess(result) {
						void navigator({
							to: "/correction/$id",
							params: { id: result.correction_id.toString() },
						})
					},
				},
			)
			return
		}

		mutation.mutate(
			{ type: "Update", id: props.artist.id, data: output },
			{
				onSuccess(result) {
					void navigator({
						to: "/correction/$id",
						params: { id: result.correction_id.toString() },
					})
				},
			},
		)
	}

	return {
		handleSubmit,
		mutation,
	}
}
