import type { uuid } from "edgedb/dist/codecs/ifaces"
import { isEmptyArrayOrNone } from "~/lib/validate/array"
import { type MemberListItem } from "../form_schema/private"
import type { ArtistByID, ArtistForm } from "../type"
type MemberList = (Pick<
	Required<MemberListItem>,
	"id" | "join_year" | "leave_year"
> & {
	id: string
})[]

export class ArtistFormHelper {
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
		return this.data.member?.filter(
			(m) => !m.is_str || m.id == null || m.id === ""
		) as unknown as MemberList | undefined
	}
	hasMemberList(): this is {
		memberList: MemberListItem[]
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
export class StrMember {
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
