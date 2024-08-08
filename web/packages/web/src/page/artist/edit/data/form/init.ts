import { sortMemberList } from "~/page/artist/utils/sort_member_list"
import { type MemberListSchema, type MemberSchema } from "."
import { type ArtistByID } from "../db"

export function initFormStoreMemberList(data: ArtistByID): MemberListSchema {
	let res: MemberListSchema = []
	if (data.artist_type === "Person") {
		res.push(...mapMember(data.member_of))
	} else {
		res.push(...mapMember(data.members))
	}
	res.push(...mapStrMember(data.str_member))
	return sortMemberList(res)
}

function mapMember(member: ArtistByID["members"] | undefined) {
	return (
		member?.map(
			(m) =>
				({
					id: m.id,
					name: m.name,
					is_str: false,
					join_year: m["@join_year"],
					leave_year: m["@leave_year"],
				}) satisfies MemberSchema
		) ?? []
	)
}

function mapStrMember(strMember: ArtistByID["str_member"]) {
	return (
		strMember?.map(
			(m) =>
				({
					name: m.name,
					is_str: false,
					join_year: m.join_year === "" ? null : Number(m.join_year),
					leave_year: m.leave_year === "" ? null : Number(m.leave_year),
				}) satisfies MemberSchema
		) ?? []
	)
}
