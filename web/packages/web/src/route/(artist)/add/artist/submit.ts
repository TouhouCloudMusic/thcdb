import { action, redirect } from "@solidjs/router"
import e from "@touhouclouddb/database"
import { uuid } from "edgedb/dist/codecs/ifaces"
import * as v from "valibot"
import { client } from "~/database/edgedb"
import { isEmptyArrayOrNone } from "~/lib/validate/array"
import { ArtistFormSchema } from "./form_schema"
import { ArtistForm } from "./type"
import { ArtistByID_EditArtistPage } from "./db"

/**
 * TODO: insert and update str members
 */

export const submitAction = action(
	async (formData: ArtistForm, initData?: ArtistByID_EditArtistPage) => {
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

export async function createOrUpdateArtist(
	formData: ArtistForm,
	initData?: ArtistByID_EditArtistPage
) {
	"use server"
	v.parse(ArtistFormSchema, formData)
	const artistAppID = e.int64(formData.id)

	class StrMember {
		constructor(
			public name: string,
			public join_year?: number,
			public leave_year?: number
		) {}
	}
	const initStrMemberList =
		initData?.artist_type === "Group" ?
			initData.members?.map(
				(m) =>
					new StrMember(
						m.name,
						m["@join_year"] ?? undefined,
						m["@leave_year"] ?? undefined
					)
			)
		:	initData?.member_of?.map((m) => new StrMember(m.name))
	const strMemberList = formData.member
		?.filter((m) => m.is_str)
		.map((m) => new StrMember(m.name, m.join_year, m.leave_year))
	const hasStrMember = !isEmptyArrayOrNone(strMemberList)

	const linkedMemberList = formData.member?.filter((m) => !m.is_str)
	const hasLinkedMember = !isEmptyArrayOrNone(linkedMemberList)

	function getBulkInsertStrMemberOfQuery() {
		return e.params({ data: e.json }, (params) =>
			e.for(e.json_array_unpack(params.data), (str_member_of) =>
				e.insert(e.Artist.StrMemberArtist, {
					name: e.cast(e.str, str_member_of["name"]),
					join_year: e.cast(e.int16, str_member_of["join_year"] ?? null),
					leave_year: e.cast(e.int16, str_member_of["leave_year"] ?? null),
				})
			)
		)
	}

	function getInsertPersonQuery() {
		return e.insert(e.Artist.Person, {
			name: formData.name,
			// TODO: str_member_of
			str_member_of: getBulkInsertStrMemberOfQuery(),
		})
	}

	function getUpdatePersonQuery() {
		return e.update(e.Artist.Person, () => ({
			filter_single: {
				app_id: artistAppID,
			},
			set: {
				name: formData.name,
				// TODO: str_member_of
				// str_member_of:
			},
		}))
	}

	// https://github.com/edgedb/edgedb-js/issues/554
	function getLinkPersonToGroupMemberQuery(uuid: uuid) {
		return e.params(
			{
				data: e.json,
			},
			(args) =>
				e.for(e.json_array_unpack(args.data), (data) =>
					e.update(e.Artist.Group, () => ({
						filter_single: {
							app_id: e.cast(e.int64, e.cast(e.str, data["app_id"])),
						},
						set: {
							members: {
								"+=": e.select(e.Artist.Person, () => ({
									filter_single: {
										id: uuid,
									},
									"@join_year": e.cast(e.int16, data["join_year"]),
									"@leave_year": e.cast(e.int16, data["leave_year"]),
								})),
							},
						},
					}))
				)
		)
	}

	function getInsertGroupQuery() {
		return e.insert(e.Artist.Group, {
			name: formData.name,
			// TODO: str_members: strMemberList,
		})
	}

	function getUpdateGroupQuery() {
		return e.insert(e.Artist.Group, {
			name: formData.name,
			// TODO: str_members: strMemberList,
		})
	}

	if (formData.artist_type === "Person") {
		try {
			await client.transaction(async (tx) => {
				let artistUUID: uuid
				if (!initData) {
					artistUUID = (await getInsertPersonQuery().run(tx)).id
				} else {
					return console.log("WIP")
				}

				if (!hasLinkedMember) return
				const groups = linkedMemberList.map((m) => ({
					app_id: m.app_id,
					join_year: !m.join_year ? null : m.join_year,
					leave_year: !m.leave_year ? null : m.leave_year,
				}))

				await getLinkPersonToGroupMemberQuery(artistUUID).run(tx, {
					data: groups,
				})
			})
		} catch (error) {
			console.log(error)
			throw error
		}
	} else {
		if (!initData) {
			await e
				.insert(e.Artist.Group, {
					name: formData.name,
					// TODO: str_members: hasStrMember ? strMemberList : undefined,
					members:
						hasLinkedMember ?
							e.select(e.detached(e.Artist.Person), (person) => ({
								filter: e.op(
									person.app_id,
									"in",
									e.set(...linkedMemberList.map((m) => e.int64(m.app_id)))
								),
							}))
						:	undefined,
				})
				.run(client)
		} else {
			return console.log("WIP")
		}
	}
	return 0
}
