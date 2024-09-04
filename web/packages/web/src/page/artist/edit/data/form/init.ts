import { pipe } from "fp-ts/function"
import * as Option from "fp-ts/Option"
import { sortMemberList } from "~/page/artist/utils/sort_member_list"
import {
	type AliasSchema,
	type ArtistFormSchema,
	type MemberListSchema,
	type MemberSchema,
} from "."
import { type ArtistByID } from "../db"

export function initFormStore(data: ArtistByID): ArtistFormSchema {
	const newValue: ArtistFormSchema = {
		id: data.id,
		name: data.name,
		localized_name: data.localized_name,
		artist_type: data.artist_type,
		alias: initAliasList(data),
	}

	pipe(
		data,
		initFormStoreMemberList,
		Option.map((m) => {
			newValue.member = m
		})
	)

	return newValue
}

function initAliasList(data: ArtistByID): AliasSchema[] {
	let res: AliasSchema[] = []
	res.push(
		...data.alias.map(
			(alias) =>
				({
					id: alias.id,
					is_str: false,
					name: alias.name,
				}) satisfies AliasSchema
		)
	)
	res.push(
		...(data.str_alias?.map(
			(name) =>
				({
					is_str: true,
					name: name,
				}) satisfies AliasSchema
		) ?? [])
	)
	return res
}

function initFormStoreMemberList(
	data: ArtistByID
): Option.Option<NonNullable<MemberListSchema>> {
	const member = data.artist_type === "Group" ? data.members : data.member_of

	return pipe(
		member,
		mapMember,
		Option.map((m) =>
			pipe(
				data.str_member,
				mapStrMember,
				Option.match(
					() => m,
					(str) => [...m, ...str]
				)
			)
		),
		Option.flatMap(sortMemberList)
	)
}

function mapMember(member: ArtistByID["members"]) {
	return member.length === 0 ?
			Option.none
		:	Option.some(
				member.map(
					(m) =>
						({
							id: m.id,
							name: m.name,
							is_str: false,
							join_year: m["@join_year"],
							leave_year: m["@leave_year"],
						}) satisfies MemberSchema
				)
			)
}

function mapStrMember(strMember: ArtistByID["str_member"]) {
	return !strMember || strMember.length === 0 ?
			Option.none
		:	Option.some(
				strMember.map(
					(m) =>
						({
							name: m.name,
							is_str: true,
							join_year: m.join_year === "" ? null : Number(m.join_year),
							leave_year: m.leave_year === "" ? null : Number(m.leave_year),
						}) satisfies MemberSchema
				)
			)
}
