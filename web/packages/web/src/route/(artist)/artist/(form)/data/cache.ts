import { cache } from "@solidjs/router"
import { findArtistByID_EditArtistPage } from "./get"

export const getArtistDataEditArtistPage = cache(async (id: string) => {
	return await findArtistByID_EditArtistPage(id)
}, "artist_data_edit_artist_page")
