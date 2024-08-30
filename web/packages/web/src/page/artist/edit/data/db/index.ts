"use server"
import e from "@touhouclouddb/database"
import { type artist, type Artist } from "@touhouclouddb/database/interfaces"
import { type uuid } from "edgedb/dist/codecs/ifaces"
import { edgedbClient } from "~/database/server"
import { op_and } from "~/lib/edgedb/op"
import { type SafePick } from "~/lib/type/safe_pick"
import { isNotEmptyOrNone } from "~/lib/validate/array"

export interface ArtistByID
	extends Pick<Artist, (typeof artistFields)[number]> {
	alias: Pick<Artist, (typeof aliasFields)[number]>[]
	members: MemberList
	member_of: MemberList
}

export type MemberList = (SafePick<Artist, (typeof memberFields)[number]> & {
	"@join_year": number | null
	"@leave_year": number | null
})[]

const artistFields = [
	"id",
	"updated_at",
	"created_at",
	"str_member",
	"app_id",
	"artist_type",
	"date_of_end",
	"date_of_start",
	"name",
	"str_alias",
] as const

const aliasFields = ["id", "app_id", "name"] as const

const memberFields = [
	"@join_year",
	"@leave_year",
	"id",
	"app_id",
	"name",
	"artist_type",
] as const

export async function findArtistByID(id: string): Promise<ArtistByID | null> {
	// TODO: user client
	const client = edgedbClient
	return client.querySingle(
		`
		SELECT default::Artist {
			${artistFields.join(",")},
			alias: { ${aliasFields.join(",")} },
			members: { ${memberFields.join(",")} },
			member_of: { ${memberFields.join(",")} },
		} FILTER .app_id = <int64><str>$id`,
		{
			id,
		}
	)
}

export type ArtistByKeywordArray = Awaited<
	ReturnType<typeof findArtistByKeyword>
>
export type ArtistByKeyword = ArtistByKeywordArray[number]

export async function findArtistByKeyword(
	keyword: string,
	artistType: artist.ArtistType,
	existArtists?: uuid[]
) {
	const query = e.select(e.Artist, (artist) => {
		const filterArray = [
			e.op(e.ext.pg_trgm.word_similarity_dist(keyword, artist.name), "<=", 0.6),
			e.op(artist.artist_type, "=", e.cast(e.artist.ArtistType, artistType)),
		]
		if (isNotEmptyOrNone(existArtists)) {
			filterArray.push(
				e.op(
					artist.id,
					"not in",
					e.array_unpack(e.literal(e.array(e.uuid), existArtists))
				)
			)
		}
		return {
			id: true,
			app_id: true,
			name: true,
			artist_type: true,

			filter: op_and(...filterArray),
			limit: 20,
		}
	})

	return await query.run(edgedbClient)
}
