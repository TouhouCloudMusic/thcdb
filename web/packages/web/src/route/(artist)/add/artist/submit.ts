import { action, redirect } from "@solidjs/router"
import { ArtistForm } from "./type"
import { ArtistByID } from "~/database/artist/find_artist_by_id"
import { createOrUpdateArtist } from "./submit_edgedb"

export const submitAction = action(
	async (formData: ArtistForm, initData?: ArtistByID) => {
		try {
			const res = await createOrUpdateArtist(formData, initData)
			console.log(res === 0 && "Ok")
		} catch (error) {
			console.log(error)
		}

		throw redirect(`add/artist/${formData.id}`)
	},
	"add_artist"
)
