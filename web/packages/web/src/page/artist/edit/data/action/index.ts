import { action, redirect } from "@solidjs/router"
import { type QueryClient } from "@tanstack/solid-query"
import * as TaskEither from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import * as v from "valibot"
import { matchUnknownToError } from "~/lib/convert/match_unknown_to_error"
import { type Nullable } from "~/lib/type/nullable"
import { type ArtistByID } from "../db"
import { ArtistFormSchema } from "../form"
import { dataQueryKey } from "../query"
import { createArtist } from "./create_artist"
import { ArtistFormHelper } from "./helpers"
import { updateArtist } from "./update_artist"

export const SubmitAction = action(
	async (
		queryClient: QueryClient,
		formData: ArtistFormSchema,
		initData?: Nullable<ArtistByID>
	) => {
		v.parse(ArtistFormSchema, formData)
		const task = pipe(
			TaskEither.tryCatch(
				() => createOrUpdateArtist(formData, initData),
				(reason) => matchUnknownToError(reason)
			),
			TaskEither.matchW(
				(err) => {
					console.log(err)

					throw err
				},
				(res) => {
					return res
				}
			)
		)
		const res = await task()
		await queryClient.invalidateQueries({
			queryKey: dataQueryKey.concat(res.app_id.toString()),
		})
		// TODO: redirect to success page
		return redirect(`artist/${res.app_id}`)
	},
	"create_or_update_artist"
)

async function createOrUpdateArtist(
	formData: ArtistFormSchema,
	initData?: Nullable<ArtistByID>
) {
	"use server"
	if (initData?.id) {
		return await updateArtist(new ArtistFormHelper(formData, initData))
	} else {
		return await createArtist(new ArtistFormHelper(formData))
	}
}
