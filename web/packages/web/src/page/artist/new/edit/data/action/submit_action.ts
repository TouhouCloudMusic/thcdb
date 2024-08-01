import { action, redirect } from "@solidjs/router"
import e from "@touhouclouddb/database"
import * as TaskEither from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import * as v from "valibot"
import { matchUnknownToError } from "~/lib/convert/match_unknown_to_error"
import { type Nullable } from "~/lib/type/nullable"
import { type ArtistByID, type ArtistForm } from "../type"
import { ArtistFormHelper, InitData } from "./helpers"
import { insertGroup } from "./submit_group"

/**
 *
 * @returns app id of the artist
 */
export async function createOrUpdateArtist(
	_formData: ArtistForm,
	_initData?: Nullable<ArtistByID>
) {
	"use server"
	try {
		v.parse(ArtistFormSchema, _formData)
		let artist_app_id = NaN
		const initData = _initData ? new InitData(_initData) : undefined
		const formData = new ArtistFormHelper(_formData)
		await client.transaction(async (tx) => {
			if (initData) {
				await convertArtistTypeIfTypeChanged(tx, formData, initData)
				artist_app_id = initData.data.app_id
			} else {
				formData.uuid =
					formData.isPerson ?
						(await insertPerson(tx, formData)).id
					:	(await insertGroup(tx, formData)).id
				artist_app_id = (await e
					.select(e.default.Artist, (artist) => ({
						filter_single: e.op(artist.id, "=", e.uuid(formData.uuid)),
						app_id: true,
					}))
					.run(tx))!.app_id
			}
			// 因为现在的ts query generator还不能在插入或更新反向链接时插入或更新链接属性，所以成员链接需要单独处理
			if (formData.isPerson) {
				if (initData) {
					await updatePerson(tx, formData)
					// member of
					await unlinkMemberOf(tx, formData, initData)
				}
				await linkMemberOf(tx, formData)
			}
		})
		return artist_app_id
	} catch (error) {
		console.error(error)
		throw error
	}
}
