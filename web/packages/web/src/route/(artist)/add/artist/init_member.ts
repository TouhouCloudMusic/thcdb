import { Artist } from "@touhouclouddb/database"
import { type Self } from "~/lib/type/self"
import { type ArtistByID_EditArtistPage as ArtistData } from "./db"
import { type ArtistForm } from "./type"
import { sortMemberList } from "../../(shared)/sort_member_list"
import { Nullable } from "vitest"

export type MemberFieldArray = ArtistForm["member"]
export class Member implements Self<NonNullable<MemberFieldArray>[number]> {
	join_year: number
	leave_year: number
	constructor(
		public id: string,
		public name: string,
		public artist_type: Artist.ArtistType,
		public is_str: boolean,
		join_year: Nullable<number>,
		leave_year: Nullable<number>
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
					m.id,
					m.name,
					m.artist_type,
					false,
					m["@join_year"],
					m["@join_year"]
				)
			)
		)
		data.str_member_of?.map((m) =>
			res.push(
				new Member(m.id, m.name, "Group", true, m.join_year, m.leave_year)
			)
		)
		return sortMemberList(res)
	} else {
		data.members?.map((m) =>
			res.push(
				new Member(
					m.id,
					m.name,
					m.artist_type,
					false,
					m["@join_year"] ?? undefined,
					m["@leave_year"] ?? undefined
				)
			)
		)
		data.str_members?.map((m) =>
			res.push(
				new Member(
					m.id,
					m.name,
					"Person",
					true,
					m.join_year ?? undefined,
					m.leave_year ?? undefined
				)
			)
		)
		return sortMemberList(res)
	}
}
