import { cache, redirect } from "@solidjs/router"
import { findArtistByID_EditArtistPage } from "./get"

export const getArtistDataEditArtistPage = cache(async (id: string) => {
	const res = await findArtistByID_EditArtistPage(id)
	if (!res) throw redirect("/404")
	return res
}, "artist_data_edit_artist_page")
