import e from "@touhouclouddb/database"
import type { Transaction } from "edgedb/dist/transaction"
import { isEmptyArrayOrNone } from "~/lib/validate/array"
import type { ArtistFormHelper } from "./helpers"

export function insertGroup(
	...[tx, formData]: [Transaction, ArtistFormHelper]
) {
	const linkedMemberIDList = formData.data.member
		?.filter((m) => !m.is_str)
		.map((m) => e.uuid(m.id ?? ""))

	return e
		.insert(e.Artist.Group, {
			name: formData.data.name,
			// TODO: str_members: hasStrMember ? strMemberList : undefined,
			str_members: formData.strMemberList,
			members:
				!isEmptyArrayOrNone(linkedMemberIDList) ?
					e.select(e.Artist.Person, (person) => ({
						filter: e.op(person.id, "in", e.set(...linkedMemberIDList)),
					}))
				:	undefined,
		})
		.run(tx)
}

export function updateGroup(
	...[tx, formData]: [Transaction, ArtistFormHelper]
) {
	// todo
	const linkedMemberIDList = formData.data.member
		?.filter((m) => !m.is_str)
		.map((m) => e.uuid(m.id!))
	return e
		.update(e.Artist.Group, () => ({
			filter_single: {
				id: formData.uuid,
			},
			set: {
				name: formData.data.name,
				str_members: formData.strMemberList,
				members:
					!isEmptyArrayOrNone(linkedMemberIDList) ?
						e.select(e.Artist.Person, (person) => ({
							filter: e.op(person.id, "in", e.set(...linkedMemberIDList)),
						}))
					:	undefined,
			},
		}))
		.run(tx)
}
