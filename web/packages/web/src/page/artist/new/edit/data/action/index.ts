import { action, redirect } from "@solidjs/router"
import * as TaskEither from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { matchUnknownToError } from "~/lib/convert/match_unknown_to_error"
import { type Nullable } from "~/lib/type/nullable"
import { type ArtistByID, type ArtistForm } from "../type"
import { createArtist } from "./create_artist"
import { ArtistFormHelper } from "./helpers"

export const submit = action(
	async (formData: ArtistForm, initData?: Nullable<ArtistByID>) => {
		"use server"
		const task = pipe(
			TaskEither.tryCatch(
				() => createOrUpdateArtist(formData, initData),
				(reason) => matchUnknownToError(reason)
			),
			TaskEither.matchW(
				(err) => {
					// TODO: redirect with error msg
					console.log(err)
					throw redirect("/500")
				},
				(res) => {
					return res
				}
			)
		)
		const res = await task()

		// TODO: revalidate cache
		// TODO: redirect to success page
		throw redirect(`artist/${res?.app_id}`)
	},
	"create_or_update_artist"
)

async function createOrUpdateArtist(
	_formData: ArtistForm,
	_initData?: Nullable<ArtistByID>
) {
	"use server"
	if (_initData?.id) {
		console.debug("not implemented")
	} else {
		return await createArtist(new ArtistFormHelper(_formData))
	}
}
