"use server"
import e from "@touhouclouddb/database"
import { client } from "../edgedb"

// type groupOmited =
// 	| "member_of"
// 	| "_member_of"
// 	| "str_member_of"
// 	| "_str_member_of"
// 	| "artist_type"
// type shapeOfGroup = Omit<Partial<(typeof e.Artist.Group)["*"]>, groupOmited>
type shapeOfGroup = Partial<(typeof e.Artist.Group)["*"]>
// type personOmited =
// 	| "members"
// 	| "_members"
// 	| "str_members"
// 	| "_str_members"
// 	| "artist_type"
// type shapeOfPerson = Omit<Partial<(typeof e.Artist.Person)["*"]>, personOmited>
type shapeOfPerson = Partial<(typeof e.Artist.Person)["*"]>
type params<T> =
	| [
			string,
			"Person",
			(T extends undefined ? undefined
			: T extends shapeOfPerson ? T
			: shapeOfPerson)?,
	  ]
	| [
			string,
			"Group",
			(T extends undefined ? undefined
			: T extends shapeOfGroup ? T
			: shapeOfGroup)?,
	  ]

export type ArtistByKeyword = ReturnType<typeof findArtistByKeyword>
export async function findArtistByKeyword<T>(
	...[keyword, type, shape]: params<T>
) {
	if (type === "Person") {
		if (shape) {
			const res = await e
				.select(e.Artist.Person, (a) => ({
					...shape,
					filter: e.op(a.name, "ilike", `%${keyword}%`),
				}))
				.run(client)
			return res
		} else {
			const res = e
				.select(e.Artist.Person, (a) => ({
					...e.Artist.Person["*"],
					filter: e.op(a.name, "ilike", `%${keyword}%`),
				}))
				.run(client)
			return res
		}
	} else {
		if (shape) {
			const res = await e
				.select(e.Artist.Group, (a) => ({
					...shape,
					filter: e.op(a.name, "ilike", `%${keyword}%`),
				}))
				.run(client)
			return res
		} else {
			const res = e
				.select(e.Artist.Group, (a) => ({
					...e.Artist.Group["*"],
					filter: e.op(a.name, "ilike", `%${keyword}%`),
				}))
				.run(client)
			return res
		}
	}
}
