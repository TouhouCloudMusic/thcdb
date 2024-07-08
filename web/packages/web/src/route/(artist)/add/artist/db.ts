"use server"
import e, { Artist } from "@touhouclouddb/database"
import { client } from "~/database/edgedb"

export type ArtistByID_EditArtistPage = Awaited<
	ReturnType<typeof findArtistByID_EditArtistPage>
>

export async function findArtistByID_EditArtistPage(id: string) {
	const query = e.select(e.default.Artist, (artist) => ({
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
		...e.is(e.Artist.Group, {
			str_members: true,
		}),
		...e.is(e.Artist.Person, {
			member_of: {
				...e.Artist.Person.member_of["*"],
				members: (members) => ({
					filter_single: e.op(members.id, "=", artist.id),
					id: true,
					join_year: members["@join_year"],
					leave_year: members["@leave_year"],
				}),
			},
		}),
		...e.is(e.Artist.Person, {
			str_member_of: true,
		}),
	}))

	const res = await query.run(client)
	return !res ? null : (
			{
				...res,
				member_of:
					res.member_of?.map((m) => ({
						...m,
						"@join_year":
							m.members.filter((person) => person.id === res.id)[0].join_year ??
							null,
						"@leave_year":
							m.members.filter((person) => person.id === res.id)[0]
								.leave_year ?? null,
						members: null,
					})) ?? null,
				str_member_of: res.str_member_of?.map((m) => ({
					name: m.name,
					join_year: m.join_year === "" ? NaN : Number(m.join_year),
					leave_year: m.leave_year === "" ? NaN : Number(m.leave_year),
				})),
				str_members: res.str_members?.map((m) => ({
					name: m.name,
					join_year: m.join_year === "" ? NaN : Number(m.join_year),
					leave_year: m.leave_year === "" ? NaN : Number(m.leave_year),
				})),
			}
		)
}

export type ArtistListByKeyword_EditArtistPage = Awaited<
	ReturnType<typeof findArtistByKeyword_EditArtistPage>
>
export type ArtistByKeyword_EditArtistPage =
	ArtistListByKeyword_EditArtistPage[number]

export async function findArtistByKeyword_EditArtistPage(
	keyword: string,
	artistType: Artist.ArtistType
) {
	let query
	switch (artistType) {
		case "Person":
			query = e.select(e.Artist.Group, (artist) => ({
				filter: e.op(artist.name, "like", `%${keyword}%`),
				id: true,
				name: true,
				artist_type: true,
			}))
			break
		case "Group":
			query = e.select(e.Artist.Person, (artist) => ({
				filter: e.op(artist.name, "like", `%${keyword}%`),
				id: true,
				name: true,
				artist_type: true,
			}))
			break
	}

	return await query.run(client)
}
