"use server"
import e from "@touhouclouddb/database"
import { client } from "../edgedb"

export type ArtistByID = Awaited<ReturnType<typeof findArtistByID>>
export async function findArtistByID(id: bigint | number | string) {
	switch (typeof id) {
		case "number":
			id = id.toString()
			break
		case "bigint":
			id = id.toString()
			break
		default:
			break
	}
	return await e
		.select(e.default.Artist, () => ({
			filter_single: {
				app_id: e.int64(id),
			},
			...e.default.Artist["*"],
			...e.is(e.Artist.Group, {
				members: {
					...e.Artist.Group.members["*"],
					"@join_year": true,
					"@leave_year": true,
				},
			}),
			...e.is(e.Artist.Person, {
				member_of: {
					...e.Artist.Person.member_of["*"],
				},
			}),
		}))
		.run(client)
}
