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

export const submit = action(
	async (
		queryClient: QueryClient,
		formData: ArtistFormSchema,
		initData?: Nullable<ArtistByID>
	) => {
		v.parse(ArtistFormSchema, formData)
		const res = await task(formData, initData)
		await queryClient.invalidateQueries({
			queryKey: dataQueryKey.concat(res.app_id.toString()),
		})
		// TODO: redirect to success page
		throw redirect(`artist/${res.app_id}`)
	},
	"create_or_update_artist"
)

async function task(
	formData: ArtistFormSchema,
	initData?: Nullable<ArtistByID>
) {
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
	return res
}

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
