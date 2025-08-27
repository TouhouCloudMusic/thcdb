import * as M from "@modular-forms/solid"
import { useNavigate } from "@tanstack/solid-router"
import type { Artist } from "@thc/api"
import { ArtistMutation } from "@thc/query"
import * as v from "valibot"

import type { NewArtistCorrection } from "~/domain/artist/schema"
import { NewArtistCorrection as NewArtistCorrectionSchema } from "~/domain/artist/schema"

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

	const handleSubmit: M.SubmitHandler<NewArtistCorrection> = (data) => {
		const parsed = v.safeParse(NewArtistCorrectionSchema, data)
		if (parsed.success) {
			let _ =
				props.type == "new"
					? mutation.mutate(
							{
								type: "Create",
								data: parsed.output,
							},
							{
								onSuccess() {
									void navigator({
										// TODO: return id after create
										to: `/`,
									})
								},
								onError() {
									// TODO: show error message
								},
							},
						)
					: mutation.mutate(
							{
								type: "Update",
								id: props.artist.id,
								data: parsed.output,
							},
							{
								onSuccess() {
									// TODO: navigate to correction page
									void navigator({
										to: `/artist/${props.artist.id}`,
									})
								},
								onError() {
									// TODO: show error message
								},
							},
						)
		} else {
			throw new M.FormError<NewArtistCorrection>(v.summarize(parsed.issues))
		}
	}

	return {
		handleSubmit,
		mutation,
	}
}
