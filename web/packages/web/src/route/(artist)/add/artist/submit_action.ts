import { action, redirect } from "@solidjs/router"
import e from "@touhouclouddb/database"
import { type uuid } from "edgedb/dist/codecs/ifaces"
import { taskEither } from "fp-ts"
import { pipe } from "fp-ts/lib/function"
import * as v from "valibot"
import { Nullable } from "vitest"
import { client } from "~/database/edgedb"
import { matchUnknownToError } from "~/lib/convert/match_unknown_to_error"
import { isEmptyArrayOrNone } from "~/lib/validate/array"
import { type ArtistByID_EditArtistPage as ArtistByID } from "./db"
import { ArtistFormSchema } from "./form_schema"
import { Member } from "./init_member"
import { insertGroup } from "./submit_group"
import {
	insertPerson,
	linkMemberOf,
	unlinkMemberOf,
	updatePerson,
} from "./submit_person"
import {
	convertArtistTypeIfTypeChanged,
	deleteUnlinkedStrMember,
	type TransactionParams,
} from "./submit_shared"
import { ArtistForm } from "./type"

export const submitAction = action(
	async (formData: ArtistForm, initData?: ArtistByID) => {
		const task = pipe(
			taskEither.tryCatch(
				() => createOrUpdateArtist(formData, initData),
				(reason) => reason
			),
			taskEither.match(
				(err) => {
					const e = matchUnknownToError(err)
					console.log(e)
					throw redirect("/500", {
						statusText: matchUnknownToError(e).message,
					})
				},
				(res) => {
					console.log("Ok")
					return res!
				}
			)
		)
		const res = await task()
		throw redirect(`artist/${res}`)
	},
	"add_artist"
)

export async function createOrUpdateArtist(
	_formData: ArtistForm,
	_initData?: ArtistByID
) {
	"use server"
	v.parse(ArtistFormSchema, _formData)
	let artist_app_id: Nullable<number> = _initData?.app_id
	const initData = _initData ? new InitData(_initData) : undefined
	const formData = new FormData(_formData)
	await client.transaction(async (tx) => {
		if (initData) {
			const params = [tx, formData, initData] as TransactionParams
			await convertArtistTypeIfTypeChanged(params)
		} else {
			formData.uuid =
				formData.isPerson ?
					(await insertPerson(tx, formData)).id
				:	(await insertGroup(tx, formData)).id
			artist_app_id = (
				await e
					.select(e.default.Artist, (artist) => ({
						filter_single: e.op(artist.id, "=", e.uuid(formData.uuid)),
						app_id: true,
					}))
					.run(tx)
			)?.app_id
		}
		// 因为现在的ts query generator还不能在插入或更新反向链接时插入或更新链接属性，所以成员链接需要单独处理
		if (formData.isPerson) {
			if (initData) {
				const params = [tx, formData, initData] as TransactionParams
				await updatePerson(params)
				await deleteUnlinkedStrMember(params)
				// member of
				await unlinkMemberOf(params)
			}
			await linkMemberOf(tx, formData)
		}
	})
	return artist_app_id
}

export class InitData {
	constructor(public data: NonNullable<ArtistByID>) {
		// this.strMemberList =
	}

	// strMemberList?: StrMember[]

	get isGroup() {
		return this.data.artist_type === "Group"
	}

	get isPerson() {
		return this.data.artist_type === "Person"
	}

	get strMemberList() {
		return this.isGroup ?
				this.data.str_members?.map(
					(m) => new StrMember(m.name, m.id, m.join_year, m.leave_year)
				)
			:	this.data.str_member_of?.map(
					(m) => new StrMember(m.name, m.id, m.join_year, m.leave_year)
				)
	}

	hasStrMemberList(): this is { strMemberList: StrMember[] } {
		return !isEmptyArrayOrNone(this.strMemberList)
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
		return this.data.member
			?.filter((m) => m.is_str)
			.map((m) => new StrMember(m.name, m.id ?? "", m.join_year, m.leave_year))
	}

	hasStrMemberList(): this is { strMemberList: StrMember[] } {
		return !isEmptyArrayOrNone(this.strMemberList)
	}

	getNewStrMember(initData?: InitData) {
		// if new is none return none
		if (!this.hasStrMemberList()) return undefined
		// if old is none return new
		let newStrMemberList: StrMember[]
		if (!initData?.hasStrMemberList()) {
			newStrMemberList = this.strMemberList
		} else {
			newStrMemberList = this.strMemberList.filter(
				(m) => !initData.strMemberList.map((m) => m.id).includes(m.id)
			)
		}
		if (newStrMemberList.length === 0) return undefined
		return newStrMemberList
	}

	getDeletedStrMemberList(initData: InitData): uuid[] | undefined {
		// nothing to delete
		if (!initData.hasStrMemberList()) return undefined

		const deleted = initData.strMemberList
			.map((oldMember) => oldMember.id)
			.filter(
				(id) =>
					!this.strMemberList?.map((newMember) => newMember.id).includes(id)
			)
		if (deleted.length === 0) return undefined
		else return deleted
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
	public join_year?: number
	public leave_year?: number
	constructor(
		public name: string,
		public id: string,
		join_year?: number | null,
		leave_year?: number | null
	) {
		this.join_year = join_year ?? undefined
		this.leave_year = leave_year ?? undefined
	}
}
