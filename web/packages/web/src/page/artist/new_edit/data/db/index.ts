"use server"
import e from "@touhouclouddb/database"
import { type artist, type Artist } from "@touhouclouddb/database/interfaces"
import { type SelectFilterExpression } from "@touhouclouddb/database/syntax.js"
import { type uuid } from "edgedb/dist/codecs/ifaces"
import { edgedbClient } from "~/database/server"
import { op_and } from "~/lib/edgedb/op"
import { type SafePick } from "~/lib/type/safe_pick"
import { isNotEmptyArrayOrNone } from "~/lib/validate/array"

export interface ArtistByID extends Pick<Artist, (typeof artistKeys)[number]> {
	alias: Pick<Artist, (typeof aliasKeys)[number]>[]
	members: MemberList
	member_of: MemberList
}

type MemberList = (SafePick<Artist, (typeof memberKeys)[number]> & {
	"@join_year": number | null
	"@leave_year": number | null
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

export async function findArtistByID(id: string): Promise<ArtistByID | null> {
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
	ReturnType<typeof findArtistByKeyword>
>
export type ArtistByKeyword = ArtistByKeywordArray[number]

export async function findArtistByKeyword(
	keyword: string,
	artistType: artist.ArtistType,
	filterArray?: uuid[]
) {
	const query = e.select(e.Artist, (artist) => ({
		id: true,
		app_id: true,
		name: true,
		artist_type: true,

		filter: op_and(
			e.op(e.ext.pg_trgm.word_similarity_dist(keyword, artist.name), "<=", 0.6),
			e.op(artist.artist_type, "=", e.cast(e.artist.ArtistType, artistType)),
			isNotEmptyArrayOrNone(filterArray) ?
				e.op(
					artist.id,
					"not in",
					e.array_unpack(e.literal(e.array(e.uuid), filterArray))
				)
			:	true
		) as SelectFilterExpression,
		limit: 20,
	}))

	return await query.run(edgedbClient)
}
