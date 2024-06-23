import { ArtistForm } from "./type"
import * as v from "valibot"
import { ArtistFormSchema } from "./form_schema"
import { client } from "~/database/edgedb"
import e from "@touhouclouddb/database"
import { isEmptyArrayOrNone } from "~/lib/validate/array"
import { ArtistByID } from "~/database/artist/find_artist_by_id"

export async function createOrUpdateArtist(
	formData: ArtistForm,
	initData?: ArtistByID
) {
	"use server"
	v.parse(ArtistFormSchema, formData)
	const textMembers = formData.member?.filter((m) => m.isStr)
	const hasTextMembers = !isEmptyArrayOrNone(textMembers)
	const linkedMembers = formData.member?.filter((m) => !m.isStr)
	const hasLinkedMembers = !isEmptyArrayOrNone(linkedMembers)
	if (!initData) {
		if (formData.artist_type === "Person") {
			const insertQuery = e.insert(e.Artist.Person, {
				name: formData.name,
				_str_member_of: formData.member
					?.filter((m) => m.isStr)
					.map((m) => m.name),
			})
			if (hasLinkedMembers) {
				const members = linkedMembers.map((m) => ({
					app_id: Number(m.app_id),
				}))

				await client.transaction(async (tx) => {
					const insertRes = await insertQuery.run(tx)
					const newArtist = e.select(e.Artist.Person, () => ({
						filter_single: {
							id: insertRes.id,
						},
					}))
					const updateMemberQuery = e.params(
						{
							groups: e.array(
								e.tuple({
									app_id: e.int64,
								})
							),
						},
						(args) =>
							e.for(e.array_unpack(args.groups), (group) =>
								e.update(e.Artist.Group, () => ({
									filter_single: {
										app_id: group.app_id,
									},
									set: {
										_members: {
											"+=": newArtist,
										},
									},
								}))
							)
					)
					await updateMemberQuery.run(tx, {
						groups: members,
					})
				})
			}
		} else {
			e.insert(e.Artist.Group, {
				name: formData.name,
				_str_members:
					hasTextMembers ?
						formData.member?.filter((m) => m.isStr).map((m) => m.name)
					:	undefined,
				_members:
					hasLinkedMembers ?
						e.select(e.detached(e.Artist.Person), (person) => ({
							filter: e.op(
								person.app_id,
								"in",
								e.set(...linkedMembers.map((m) => e.int64(m.app_id)))
							),
						}))
					:	undefined,
			})
		}
	} else {
		console.log("WIP")
	}
	return 0
}
