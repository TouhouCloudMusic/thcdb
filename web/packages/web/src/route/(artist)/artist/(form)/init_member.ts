import { type Artist } from "@touhouclouddb/database/interfaces"
import type { Nullable } from "vitest"
import { type Self } from "~/lib/type/self"
import { sortMemberList } from "../../utils/sort_member_list"
import { type ArtistByID_EditArtistPage as ArtistData } from "./data/get"
import { type ArtistForm } from "./type"

export type MemberFieldArray = ArtistForm["member"]
export class Member implements Self<NonNullable<MemberFieldArray>[number]> {
	join_year: number
	leave_year: number
	constructor(
		public name: string,
		public artist_type: Artist.ArtistType,
		public is_str: boolean,
		join_year: Nullable<number>,
		leave_year: Nullable<number>,
		public id?: string
	) {
		// 空值注入表单后会变成NaN
		this.join_year = join_year ?? NaN
		this.leave_year = leave_year ?? NaN
	}
}

export function initFormStore_Member(
	data: NonNullable<ArtistData>
): MemberFieldArray {
	let res: MemberFieldArray = []
	if (data.artist_type === "Person") {
		data.member_of?.map((m) =>
			res.push(
				new Member(
					m.name,
					m.artist_type,
					false,
					m["@join_year"],
					m["@leave_year"],
					m.id
				)
			)
		)
		data.str_member_of?.map((m) =>
			res.push(new Member(m.name, "Group", true, m.join_year, m.leave_year))
		)
		return sortMemberList(res)
	} else {
		data.members?.map((m) =>
			res.push(
				new Member(
					m.name,
					m.artist_type,
					false,
					m["@join_year"] ?? undefined,
					m["@leave_year"] ?? undefined,
					m.id
				)
			)
		)
		data.str_members?.map((m) =>
			res.push(new Member(m.name, "Person", true, m.join_year, m.leave_year))
		)
		return sortMemberList(res)
	}
}
