"use server"
import e from "@touhouclouddb/database"
import { ArtistType } from "~/database/artist/type"
import { client } from "~/database/edgedb"

export async function findArtistByKeyword_EditArtistPage(
	keyword: string,
	artistType: ArtistType
) {
	return await e
		.select(e.default.Artist, (artist) => ({
			filter: e.op(
				e.op(artist.name, "like", `%${keyword}%`),
				"and",
				e.op(artist.artist_type, "!=", e.Artist.ArtistType[artistType])
			),
			app_id: true,
			name: true,
			artist_type: true,
		}))
		.run(client)
}
