import { sortMemberList } from "~/page/artist/utils/sort_member_list"
import { type ArtistByID } from "../db"
import { type MemberList, type MemberListItem } from "./schema"

export function initFormStoreMemberList(
	data: NonNullable<ArtistByID>
): MemberList {
	let res: MemberList = []
	if (data.artist_type === "Person") {
		data.member_of.map((m) =>
			res.push({
				id: m.id,
				name: m.name,
				is_str: false,
				join_year: m["@join_year"],
				leave_year: m["@leave_year"],
			} satisfies MemberListItem)
		)
		data.str_member?.map((m) =>
			res.push({
				id: "",
				name: m.name,
				is_str: true,
				join_year: m.join_year === "" ? undefined : Number(m.join_year),
				leave_year: m.leave_year === "" ? undefined : Number(m.leave_year),
			} satisfies MemberListItem)
		)
		return sortMemberList(res)
	} else {
		data.members.map((m) =>
			res.push({
				id: m.id,
				name: m.name,
				is_str: false,
				join_year: m["@join_year"],
				leave_year: m["@leave_year"],
			} as MemberListItem)
		)
		data.str_member?.map((m) =>
			res.push({
				name: m.name,
				is_str: false,
				join_year: m.join_year === "" ? undefined : Number(m.join_year),
				leave_year: m.leave_year === "" ? undefined : Number(m.leave_year),
			} as MemberListItem)
		)
		return sortMemberList(res)
	}
}
