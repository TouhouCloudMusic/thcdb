import { Artist } from "@touhouclouddb/database"
import { type Self } from "~/lib/type/self"
import { type ArtistByID_EditArtistPage as ArtistData } from "./db"
import { type ArtistForm } from "./type"
import { sortMemberList } from "../../(shared)/sort_member_list"

export type MemberFieldArray = ArtistForm["member"]
class Member implements Self<NonNullable<MemberFieldArray>[number]> {
	constructor(
		public uuid: string,
		public app_id: string,
		public name: string,
		public artist_type: Artist.ArtistType,
		public is_str: boolean,
		public join_year?: number,
		public leave_year?: number
	) {}
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
					m.app_id.toString(),
					m.name,
					m.artist_type,
					false,
					m["@join_year"] ?? undefined,
					m["@join_year"] ?? undefined
				)
			)
		)
		data.str_member_of?.map((m) =>
			res.push(
				new Member(m.id, "", m.name, "Group", true, undefined, undefined)
			)
		)
		return sortMemberList(res)
	} else {
		data.members?.map((m) =>
			res.push(
				new Member(
					m.id,
					m.app_id.toString(),
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
					"",
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
