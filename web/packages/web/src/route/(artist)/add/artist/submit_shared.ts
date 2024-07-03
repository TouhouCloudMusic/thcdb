import e from "@touhouclouddb/database"
import { Transaction } from "edgedb/dist/transaction"
import { FormData, InitData } from "./submit_action"

export type TransactionParams = [Transaction, FormData, InitData]

export function deleteUnlinkedStrMember([
	tx,
	formData,
	initData,
]: TransactionParams) {
	const deletedStrMemberList =
		formData.getDeletedStrMemberList(initData) ?? undefined
	if (!deletedStrMemberList) return
	return e
		.delete(e.Artist.StrMemberArtist, (str_member) => ({
			filter: e.op(
				str_member.id,
				"in",
				e.set(...deletedStrMemberList.map((id) => e.uuid(id)))
			),
		}))
		.run(tx)
}
// TODO: link aliases
/**
 * Transforms a person to a group if the artist type has changed.
 *
 * *If type not changed, this function won't do anything.*
 * @returns A promise that resolves when the transformation is complete.
 */
export async function convertArtistTypeIfTypeChanged([
	tx,
	formData,
	initData,
]: TransactionParams) {
	// Check if the artist type has changed
	const typeChanged = formData.data.artist_type !== initData.data.artist_type
	// If the artist type has not changed, do nothing
	if (!typeChanged) return

	const insertData = {
		id: initData.data.id,
		name: initData.data.name,
		app_id: initData.data.app_id,
		text_alias: initData.data.text_alias,
		date_of_start: initData.data.date_of_start,
		date_of_end: initData.data.date_of_end,
		create_at: initData.data.create_at,
	}

	if (initData.isPerson) {
		await e
			.delete(e.Artist.Person, () => ({
				filter_single: {
					id: initData.data.id,
				},
			}))
			.run(tx)

		return await e
			.insert(e.Artist.Group, {
				...insertData,
			})
			.run(tx)
	} else {
		await e
			.delete(e.Artist.Group, () => ({
				filter_single: {
					id: initData.data.id,
				},
			}))
			.run(tx)

		return await e.insert(e.Artist.Person, insertData).run(tx)
	}
}

export function mapNewStrMemberToInsertQuery<T extends NonNullable<FormData["strMemberList"]>>(
	newStrMemberList: T
) {
	return e.set(
		...newStrMemberList.map((m) =>
			e.insert(e.Artist.StrMemberArtist, {
				name: e.cast(e.str, m.name),
				join_year: m.join_year ? e.cast(e.int16, m.join_year) : null,
				leave_year: m.leave_year ? e.cast(e.int16, m.leave_year) : null,
			})
		)
	)
}
