import e from "@touhouclouddb/database"
import { Transaction } from "edgedb/dist/transaction"
import { isEmptyArrayOrNone } from "~/lib/validate/array"
import { FormData } from "./submit_action"
import {
	mapNewStrMemberToInsertQuery,
	TransactionParams,
} from "./submit_shared"

export function insertGroup(...[tx, formData]: [Transaction, FormData]) {
	const strMembers = formData.getNewStrMember()

	const linkedMemberIDList = formData.data.member
		?.filter((m) => !m.is_str)
		.map((m) => e.uuid(m.id ?? ""))

	return e
		.insert(e.Artist.Group, {
			name: formData.data.name,
			// TODO: str_members: hasStrMember ? strMemberList : undefined,
			str_members: strMembers ? mapNewStrMemberToInsertQuery(strMembers) : null,
			members:
				!isEmptyArrayOrNone(linkedMemberIDList) ?
					e.select(e.Artist.Person, (person) => ({
						filter: e.op(person.id, "in", e.set(...linkedMemberIDList)),
					}))
				:	undefined,
		})
		.run(tx)
}

export function updateGroup([tx, formData, initData]: TransactionParams) {
	const strMemberOf = formData.getNewStrMember(initData)

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
				str_members:
					strMemberOf ?
						{
							"+=": strMemberOf,
						}
					:	undefined,
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
