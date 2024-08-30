import { action } from "@solidjs/router"
import * as v from "valibot"
import { type Nullable } from "~/lib/type/nullable"
import { type ArtistByID } from "../db"
import { ArtistFormSchema } from "../form"
import { createArtist } from "./create_artist"
import { ArtistFormHelper } from "./helpers"
import { updateArtist } from "./update_artist"

export const SubmitAction = action(
	async (formData: ArtistFormSchema, initData?: Nullable<ArtistByID>) => {
		v.parse(ArtistFormSchema, formData)

		return (await createOrUpdateArtist(formData, initData)).app_id
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
