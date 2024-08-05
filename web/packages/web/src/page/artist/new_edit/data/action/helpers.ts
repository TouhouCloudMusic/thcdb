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
import { type NonEmptyArray } from "~/lib/type/array"
import { type Filter } from "~/lib/type/filter"
import { isNotEmptyArray, isNotEmptyArrayOrNone } from "~/lib/validate/array"
import type { ArtistByID } from "../db"
import { type ArtistFormSchema, type MemberSchema } from "../form"

type LinkedMember = Pick<MemberSchema, "id" | "join_year" | "leave_year">

type LinkedMemberList = NonEmptyArray<LinkedMember>

type StrMember = {
	name: string
	join_year: string
	leave_year: string
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

	private get initMemberIDList(): NonEmptyArray<string> | undefined {
		if (!this.initData) return undefined

		if (this.initData.artist_type == "Group") {
			const res = this.initData.members.map((m) => m.id)
			if (isNotEmptyArray(res)) return res
		} else {
			const res = this.initData.member_of.map((m) => m.id)
			if (isNotEmptyArray(res)) return res
		}
		return undefined
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

	private get insertBaseShape() {
		return {
			artist_type: this.formData.artist_type,
			name: this.formData.name,
			...(isNotEmptyArrayOrNone(this.strMemberList) ?
				{ str_member: this.strMemberList }
			:	undefined),
		} satisfies InsertShape<$Artist> & BaseShape
	}
	private get linkMemberList(): LinkedMemberList | undefined {
		const formDataMemberList = this.formData.member?.filter(
			(m) => !m.is_str || m.id !== ""
		)
		if (!isNotEmptyArrayOrNone(formDataMemberList)) return undefined
		else return formDataMemberList
	}

	public get hasLinkMemberList() {
		return !this.linkMemberList
	}

	private get linkMemberJsonDataExp() {
		if (!this.linkMemberList) {
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
		if (!this.linkMemberList) return undefined
		if (this.isPerson) {
			return null
		} else {
			const query = e.op(
				"distinct",
				e.for(this.linkMemberJsonDataExp, (data) =>
					e.select(e.default.Artist, (artist) => ({
						filter: e.op(artist.id, "=", uuidExp(data)),
						...joinYearAndLeaveYearExp(data),
					}))
				)
			)
			return query
		}
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
		if (!this.initData) return undefined

		return this.initData.member_of
			.map((m) => m.id)
			.filter((id) => !this.initMemberIDList?.includes(id))
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
		if (this.initData.name !== this.formData.name) {
			res.name = this.formData.name
		}
		if (this.initData.artist_type !== this.formData.artist_type) {
			res.artist_type = this.formData.artist_type
		}

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

		const query = e.select(
			e.assert_single(
				e.update(e.default.Artist, () => ({
					filter_single: {
						id: uuid,
					},
					set: {
						...this.updateArtistShapeBase,
						members: this.linkMembersQuery,
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
