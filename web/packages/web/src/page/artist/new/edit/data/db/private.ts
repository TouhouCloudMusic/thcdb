"use server"
import e from "@touhouclouddb/database"
import { type Artist, type artist } from "@touhouclouddb/database/interfaces"
import { edgedbClient } from "~/database/server"
import { type SafePick } from "~/lib/type/safe_pick"

export interface ArtistByID extends Pick<Artist, (typeof artistKeys)[number]> {
	alias: Pick<Artist, (typeof aliasKeys)[number]>[]
	members: MemberKindArray
	member_of: MemberKindArray
}

type MemberKindArray = (SafePick<Artist, (typeof memberKeys)[number]> & {
	"@join_year": number
	"@leave_year": number
})[]

const artistKeys = [
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

const aliasKeys = ["id", "app_id", "name"] as const

const memberKeys = [
	"@join_year",
	"@leave_year",
	"id",
	"app_id",
	"name",
	"artist_type",
] as const

export async function findArtistByID_EditArtistPage(
	id: string
): Promise<ArtistByID | null> {
	const client = edgedbClient
	return client.querySingle(
		`
		SELECT default::Artist {
			${artistKeys.join(",")},
			alias: { ${aliasKeys.join(",")} },
			members: { ${memberKeys.join(",")} },
			member_of: { ${memberKeys.join(",")} },
		} FILTER .app_id = <int64><str>$id`,
		{
			id,
		}
	)
}

export type ArtistByKeywordArray = Awaited<
	ReturnType<typeof findArtistByKeyword_EditArtistPage>
>
export type ArtistByKeyword = ArtistByKeywordArray[number]

export async function findArtistByKeyword_EditArtistPage(
	keyword: string,
	artistType: artist.ArtistType
) {
	const query = e.select(e.Artist, (artist) => ({
		id: true,
		app_id: true,
		name: true,
		artist_type: true,
		filter: e.op(
			e.op(e.ext.pg_trgm.word_similarity_dist(keyword, artist.name), "<=", 0.6),
			"and",
			e.op(artist.artist_type, "=", e.cast(e.artist.ArtistType, artistType))
		),
	}))

	return await query.run(edgedbClient)
}
