import { action, redirect, reload } from "@solidjs/router"
import e from "@touhouclouddb/database"
import { type uuid } from "edgedb/dist/codecs/ifaces"
import * as TaskEither from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import * as v from "valibot"
import { matchUnknownToError } from "~/lib/convert/match_unknown_to_error"
import { isEmptyArrayOrNone } from "~/lib/validate/array"
import { findArtistByID_EditArtistPage } from "./data/get"
import { ArtistFormSchema } from "./form_schema"
import type { Member } from "./init_member"
import { insertGroup } from "./submit_group"
import {
	insertPerson,
	linkMemberOf,
	unlinkMemberOf,
	updatePerson,
} from "./submit_person"
import { convertArtistTypeIfTypeChanged } from "./submit_shared"
import type { ArtistForm } from "./type"

export const submitAction = action(
	async (formData: ArtistForm, initData?: ArtistByID) => {
		const task = pipe(
			TaskEither.tryCatch(
				() => createOrUpdateArtist(formData, initData),
				(reason) => matchUnknownToError(reason)
			),
			TaskEither.match(
				() => {
					// TODO: with error msg
					throw redirect("/500")
				},
				(res) => {
					console.log("Ok")
					return res
				}
			)
		)
		const res = await task()
		// throw redirect(`artist/${res}`)
		reload({
			revalidate: findArtistByID_EditArtistPage.keyFor({ id: res.toString() }),
		})
		throw redirect(`add/artist/${res}`)
	},
	"add_artist"
)
/**
 *
 * @returns app id of the artist
 */
export async function createOrUpdateArtist(
	_formData: ArtistForm,
	_initData?: ArtistByID
) {
	"use server"
	try {
		v.parse(ArtistFormSchema, _formData)
		let artist_app_id = NaN
		const initData = _initData ? new InitData(_initData) : undefined
		const formData = new FormData(_formData)
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

export class InitData {
	constructor(public data: NonNullable<ArtistByID>) {}

	get isGroup() {
		return this.data.artist_type === "Group"
	}

	get isPerson() {
		return this.data.artist_type === "Person"
	}

	get memberList() {
		return this.isGroup ? this.data.members : this.data.member_of
	}

	hasMemberList(): this is {
		memberList: {
			id: string
			create_at: Date | null
			update_at: Date | null
			app_id: number
			date_of_end: Date | null
			date_of_start: Date | null
			name: string
			text_alias: string[]
			artist_type: "Person" | "Group"
			"@join_year": number | null
			"@leave_year": number | null
		}[]
	} {
		return !isEmptyArrayOrNone(this.memberList)
	}
}

export class FormData {
	constructor(public data: ArtistForm) {
		this.#uuid = data.id
	}
	#uuid?: uuid

	get uuid() {
		if (!this.#uuid || this.#uuid === "") {
			throw new Error("UUID is not set")
		}
		return this.#uuid
	}

	set uuid(id: string) {
		this.#uuid = id
	}

	get isGroup() {
		return this.data.artist_type === "Group"
	}

	get isPerson() {
		return this.data.artist_type === "Person"
	}

	get strMemberList() {
		return (
			this.data.member
				?.filter((m) => m.is_str)
				.map((m) => new StrMember(m.name, m.join_year, m.leave_year)) ?? []
		)
	}

	hasStrMemberList(): this is { strMemberList: StrMember[] } {
		return !isEmptyArrayOrNone(this.strMemberList)
	}

	get memberList() {
		return this.data.member?.filter((m) => !m.is_str)
	}

	hasMemberList(): this is {
		memberList: Member[]
	} {
		return !isEmptyArrayOrNone(this.memberList)
	}

	getUnlinkedMemberList(initData: InitData): uuid[] | undefined {
		// nothing to unlink
		if (!initData.hasMemberList()) return undefined

		const unlinked = initData.memberList
			.map((oldMember) => oldMember.id)
			.filter(
				(id) => !this.memberList?.map((newMember) => newMember.id).includes(id)
			)
		if (unlinked.length === 0) return undefined
		return unlinked
	}
}

class StrMember {
	public join_year: string
	public leave_year: string
	constructor(
		public name: string,
		join_year?: number | null,
		leave_year?: number | null
	) {
		this.join_year = join_year?.toString() ?? ""
		this.leave_year = leave_year?.toString() ?? ""
	}
}
