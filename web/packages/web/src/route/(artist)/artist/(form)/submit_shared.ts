import e from "@touhouclouddb/database"
import type { Transaction } from "edgedb/dist/transaction"
import type { FormData, InitData } from "./submit_action"

// TODO: link aliases
/**
 * Transforms a person to a group if the artist type has changed.
 *
 * *If type not changed, this function won't do anything.*
 * @returns A promise that resolves when the transformation is complete.
 */
export async function convertArtistTypeIfTypeChanged(
	tx: Transaction,
	formData: FormData,
	initData: InitData
) {
	// Check if the artist type has changed
	const typeChanged = formData.data.artist_type !== initData.data.artist_type
	// If the artist type has not changed, do nothing
	if (!typeChanged) return

	const insertData = {
		// id: initData.data.id,
		name: initData.data.name,
		app_id: initData.data.app_id,
		str_alias: initData.data.str_alias,
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
