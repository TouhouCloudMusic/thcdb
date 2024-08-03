import e from "@touhouclouddb/database"
import { type artist, type Artist } from "@touhouclouddb/database/interfaces"
import { type $Artist } from "@touhouclouddb/database/modules/default.js"
import { type $json } from "@touhouclouddb/database/modules/std.js"
import {
	type Cardinality,
	type TypeSet,
} from "@touhouclouddb/database/reflection.js"
import {
	type $expr_ForVar,
	type InsertShape,
	type UpdateShape,
} from "@touhouclouddb/database/syntax.js"
import { type uuid } from "edgedb/dist/codecs/ifaces"
import { expr } from "~/lib/edgedb"
import { appendOptionalKey, optionalKey } from "~/lib/object/optional_key"
import { type Filter } from "~/lib/type/filter"
import { isEmptyArrayOrNone, isNotEmptyArrayOrNone } from "~/lib/validate/array"
import type { ArtistByID } from "../db"
import { type ArtistFormSchema, type MemberListItem } from "../form"

type LinkedMember = Pick<
	Required<MemberListItem>,
	"id" | "join_year" | "leave_year"
>

type LinkedMemberList = LinkedMember[]

type StrMember = {
	name: string
	join_year: string
	leave_year: string
}

type MembersSubQuery = {
	"+=": NonNullable<ArtistFormHelper["linkMembersQuery"]>
	"-=": NonNullable<ArtistFormHelper["unlinkMembersQuery"]>
}

export type ArtistQueryReturnShape = Filter<
	Artist,
	typeof ArtistQueryReturnShape
>
export const ArtistQueryReturnShape = {
	id: true,
	app_id: true,
} as const

type BaseShape = {
	name: string
	artist_type: artist.ArtistType
	str_member?: StrMember[]
}

export class ArtistFormHelper {
	constructor(
		public readonly formData: ArtistFormSchema,
		public readonly initData?: ArtistByID
	) {}

	public get isGroup() {
		return this.formData.artist_type === "Group"
	}

	public get isPerson() {
		return this.formData.artist_type === "Person"
	}

	private get initMemberList() {
		if (!this.initData) return undefined

		if (this.initData.artist_type == "Group") {
			return this.initData.members.map((m) => m.id)
		} else {
			return this.initData.member_of.map((m) => m.id)
		}
	}

	private get strMemberList(): StrMember[] {
		return (
			this.formData.member
				?.filter((m) => m.is_str)
				.map(
					(m) =>
						({
							name: m.name,
							join_year: m.join_year?.toString() ?? "",
							leave_year: m.leave_year?.toString() ?? "",
						}) as StrMember
				) ?? []
		)
	}

	private get initStrMemberList() {
		return this.initData?.str_member?.map(
			(m) =>
				({
					name: m.name,
					join_year: m.join_year,
					leave_year: m.leave_year,
				}) as StrMember
		)
	}

	private get linkMemberList(): LinkedMemberList | undefined {
		const formDataMemberList = this.formData.member?.filter(
			(m) => !m.is_str || m.id !== ""
		)

		if (!this.initData) {
			return formDataMemberList
		}

		const initMemberList = (
			this.initData.artist_type == "Group" ?
				this.initData.members
			:	this.initData.member_of).map((m) => m.id)

		return formDataMemberList?.filter((m) => !initMemberList.includes(m.id))
	}

	public get hasLinkMemberList() {
		return isNotEmptyArrayOrNone(this.linkMemberList)
	}

	private get insertBaseShape() {
		return {
			artist_type: this.formData.artist_type,
			name: this.formData.name,
			...(isNotEmptyArrayOrNone(this.strMemberList) ?
				{ str_member: this.strMemberList }
			:	undefined),
		} satisfies InsertShape<$Artist> & BaseShape
	}

	private get linkMemberJsonDataExp() {
		if (isEmptyArrayOrNone(this.linkMemberList)) {
			throw new Error("cannot get linkMemberExp when linkMemberList is none")
		}
		return toJsonArrayEdgeQLExpr(
			this.linkMemberList.map((data) => ({
				id: data.id,
				join_year: data.join_year,
				leave_year: data.leave_year,
			}))
		)
	}

	private get linkMembersQuery() {
		if (isEmptyArrayOrNone(this.linkMemberList)) return undefined
		return e.for(this.linkMemberJsonDataExp, (data) =>
			e.select(e.default.Artist, (artist) => ({
				filter: e.op(artist.id, "=", uuidExp(data)),
				...joinYearAndLeaveYearExp(data),
			}))
		)
	}

	private get unlinkMembersList() {
		if (!this.initData) return undefined

		const unlinks = this.initMemberList?.filter(
			(id) => !this.formData.member?.map((m) => m.id).includes(id)
		)

		if (!isNotEmptyArrayOrNone(unlinks)) return undefined

		return unlinks
	}

	private get unlinkMembersQuery() {
		if (isEmptyArrayOrNone(this.unlinkMembersList)) return undefined
		return e.select(e.default.Artist, (artist) => ({
			filter: e.op(
				artist.id,
				"in",
				expr.fromArray(this.unlinkMembersList!, e.uuid)
			),
		}))
	}

	public linkMemberOfQuery = (uuid: uuid) => {
		if (this.isGroup) {
			throw new Error("should not get linkMemberOfQuery when artist is a group")
		}
		if (!this.hasLinkMemberList) {
			throw new Error(
				"cannot get linkMemberOfQuery when linkMemberList is none"
			)
		}

		return e.op(
			"distinct",
			e.for(this.linkMemberJsonDataExp, (data) =>
				e.update(e.default.Artist, (artist) => ({
					filter_single: e.op(artist.id, "=", uuidExp(data)),
					set: {
						members: {
							"+=": e.select(e.default.Artist, () => ({
								filter_single: {
									id: uuid,
								},
								...joinYearAndLeaveYearExp(data),
							})),
						},
					},
				}))
			)
		)
	}

	private get unlinkMemberOfList() {
		if (!this.initData) return null

		return this.initData.member_of
			.map((m) => m.id)
			.filter((id) => !this.initMemberList?.includes(id))
	}

	public get hasUnlinkMemberOfList() {
		return isNotEmptyArrayOrNone(this.unlinkMemberOfList)
	}

	public unlinkMemberOfQuery = (uuid: uuid) => {
		if (this.isGroup) {
			throw new Error("should not unlinkMemberOfQuery when artist is a group")
		}
		if (!this.initData) {
			throw new Error("cannot get unlinkMemberOfQuery when initData is none")
		}
		const unlinks = this.unlinkMemberOfList
		if (!isNotEmptyArrayOrNone(unlinks)) {
			throw new Error(
				"cannot get unlinkMemberOfQuery when unlinkMemberOfList is none"
			)
		}

		const person = e.select(e.default.Artist, () => ({
			filter_single: {
				id: uuid,
			},
		}))

		return e.with(
			[person],
			e.update(e.default.Artist, (artist) => ({
				filter: e.op(artist.id, "in", expr.fromArray(unlinks, e.uuid)),
				set: {
					members: {
						"-=": e.select(e.default.Artist, () => ({
							filter_single: {
								id: uuid,
							},
						})),
					},
				},
			}))
		)
	}

	public get updateArtistShapeBase() {
		if (!this.initData) {
			throw new Error("cannot get update query when init data is none")
		}
		let res: Partial<BaseShape> = {}
		res = appendOptionalKey(
			res,
			this.initData.name !== this.formData.name,
			"name",
			this.formData.name
		)
		res = appendOptionalKey(
			res,
			this.initData.artist_type !== this.formData.artist_type,
			"artist_type",
			this.formData.artist_type
		)

		return {
			...res,
			str_member: this.strMemberList,
		} satisfies UpdateShape<TypeSet<$Artist, Cardinality.One>>
	}

	public get insertPersonQuery() {
		const insertQuery = e.insert(e.default.Artist, {
			...this.insertBaseShape,
		})

		return e.select(insertQuery, () => ArtistQueryReturnShape)
	}

	public get updatePersonQuery() {
		if (!this.initData) {
			throw new Error("cannot get update query when init data is none")
		}
		const uuid = this.initData.id
		return e.select(
			e.update(e.default.Artist, () => ({
				filter_single: {
					id: uuid,
				},
				set: {
					...this.updateArtistShapeBase,
				},
			})),
			() => ({
				...ArtistQueryReturnShape,
			})
		)
	}

	public get insertGroupQuery() {
		return e.select(
			e.insert(e.default.Artist, {
				...this.insertBaseShape,
				members: this.linkMembersQuery,
			}),
			() => ArtistQueryReturnShape
		)
	}

	public get updateGroupQuery() {
		if (!this.initData) {
			throw new Error("cannot get update query when init data is none")
		}

		const uuid = this.initData.id

		let memberSubQuery: Partial<MembersSubQuery>

		if (this.linkMembersQuery != null || this.unlinkMembersQuery != null) {
			memberSubQuery = {
				...optionalKey(
					this.linkMembersQuery != null,
					"+=",
					this.linkMembersQuery
				),
				...optionalKey(
					this.unlinkMembersQuery != null,
					"-=",
					this.unlinkMembersQuery
				),
			}
		}

		const query = e.select(
			e.assert_single(
				e.update(e.default.Artist, () => ({
					filter_single: {
						id: uuid,
					},
					set: {
						...this.updateArtistShapeBase,
						members: memberSubQuery as MembersSubQuery | undefined,
					},
				}))
			),
			() => ({
				...ArtistQueryReturnShape,
			})
		)

		return query
	}
}

function leaveYearExp(data: $expr_ForVar<$json>) {
	return e.cast(e.int16, e.json_get(data, "leave_year"))
}

function joinYearExp(data: $expr_ForVar<$json>) {
	return e.cast(e.int16, e.json_get(data, "join_year"))
}

function uuidExp(data: $expr_ForVar<$json>) {
	return e.cast(e.uuid, e.json_get(data, "id"))
}

function joinYearAndLeaveYearExp(data: $expr_ForVar<$json>) {
	return {
		"@join_year": joinYearExp(data),
		"@leave_year": leaveYearExp(data),
	}
}

function toJsonArrayEdgeQLExpr(data: unknown[]) {
	return e.json_array_unpack(e.json(data))
}
