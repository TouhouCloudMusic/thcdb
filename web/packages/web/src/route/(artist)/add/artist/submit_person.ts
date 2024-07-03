import e from "@touhouclouddb/database"
import { Transaction } from "edgedb/dist/transaction"
import { isEmptyArrayOrNone } from "~/lib/validate/array"
import { FormData } from "./submit_action"
import {
	mapNewStrMemberToInsertQuery,
	TransactionParams,
} from "./submit_shared"

export function insertPerson(tx: Transaction, formData: FormData) {
	const newStrMemberOf = formData.getNewStrMember()
	return e
		.insert(e.Artist.Person, {
			name: formData.data.name,
			// TODO: str_member_of
			str_member_of:
				newStrMemberOf ?
					mapNewStrMemberToInsertQuery(newStrMemberOf)
				:	undefined,
		})
		.run(tx)
}

export async function updatePerson([
	tx,
	formData,
	initData,
]: TransactionParams) {
	const newStrMemberOf = formData.getNewStrMember(initData)
	return e
		.update(e.Artist.Person, () => ({
			filter_single: {
				id: formData.uuid,
			},
			set: {
				name: formData.data.name,
				// TODO: str_member_of
				str_member_of:
					newStrMemberOf ?
						{
							"+=": mapNewStrMemberToInsertQuery(newStrMemberOf),
						}
					:	undefined,
			},
		}))
		.run(tx)
}

// member of

// https://github.com/edgedb/edgedb-js/issues/554
/**
 * Link person to group member if person is a member of group.
 *
 * *This function links a person to a group member if the person is a member of the group.
 * It takes a transaction object and a form data object as parameters.
 * The form data object must contain a member list.
 * The function maps the member list to an array of objects containing the necessary data,
 * and then performs an update operation on the group record.
 * The update operation adds the member to the members array of the group,
 * and sets the join_year and leave_year fields of the member to the corresponding values from the member list.*
 *
 * @returns A promise that resolves to an array of group IDs which the transaction has affected when the operation is complete.
 */
export async function linkMemberOf(tx: Transaction, formData: FormData) {
	// Check if there are any members to link
	if (!formData.hasMemberList()) return

	// Map the member list to an array of objects containing the necessary data
	const linkedGroups = formData.memberList.map((m) => ({
		id: m.id ?? "",
		join_year: m.join_year ?? null,
		leave_year: m.leave_year ?? null,
	}))

	// Perform the update operation
	return await e
		.params(
			{
				groups: e.json,
			},
			(args) =>
				e.for(e.json_array_unpack(args.groups), (data) =>
					e.update(e.Artist.Group, () => ({
						filter_single: {
							id: e.cast(e.uuid, data["id"]),
						},
						set: {
							// Add the member to the members array
							members: {
								"+=": e.select(e.Artist.Person, () => ({
									filter_single: {
										id: formData.uuid,
									},
									"@join_year": e.cast(e.int16, data["join_year"]),
									"@leave_year": e.cast(e.int16, data["leave_year"]),
								})),
							},
						},
					}))
				)
		)
		.run(tx, {
			groups: linkedGroups,
		})
}

export function unlinkMemberOf([tx, formData, initData]: TransactionParams) {
	const unlinkedGroups = formData.getUnlinkedMemberList(initData)
	if (isEmptyArrayOrNone(unlinkedGroups)) return
	return e
		.params(
			{
				groups: e.array(e.uuid),
			},
			(args) =>
				e.for(e.array_unpack(args.groups), (id) =>
					e.update(e.Artist.Group, () => ({
						filter_single: {
							id: e.cast(e.uuid, id),
						},
						set: {
							members: {
								"-=": e.select(e.Artist.Person, () => ({
									filter_single: {
										id: initData.data.id,
									},
								})),
							},
						},
					}))
				)
		)
		.run(tx, {
			groups: unlinkedGroups,
		})
}
