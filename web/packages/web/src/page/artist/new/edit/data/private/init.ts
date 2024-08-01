import { sortMemberList } from "~/page/artist/utils/sort_member_list"
import { type ArtistByID } from "../db/private"
import { type ArtistForm } from "../form_schema/private"

type MemberFieldArray = ArtistForm["member"]
type Member = NonNullable<MemberFieldArray>[number]

export function initFormStoreMemberList(
	data: NonNullable<ArtistByID>
): MemberFieldArray {
	let res: MemberFieldArray = []
	if (data.artist_type === "Person") {
		data.member_of.map((m) =>
			res.push({
				id: m.id,
				name: m.name,
				is_str: false,
				join_year: m["@join_year"],
				leave_year: m["@leave_year"],
			} satisfies Member)
		)
		data.str_member?.map((m) =>
			res.push({
				name: m.name,
				is_str: false,
				join_year: Number(m.join_year),
				leave_year: Number(m.leave_year),
			} satisfies Member)
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
			} as Member)
		)
		data.str_member?.map((m) =>
			res.push({
				name: m.name,
				is_str: false,
				join_year: Number(m.join_year),
				leave_year: Number(m.leave_year),
			} as Member)
		)
		return sortMemberList(res)
	}
}
