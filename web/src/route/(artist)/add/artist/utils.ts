import { ArtistType } from "@prisma/client"
import { ArtistDataByID } from "~/database/artist/find_artist_by_id"
import { ArtistForm } from "./type"

type MemberArtist = ArtistDataByID["members"][number]
type MemberGroup = ArtistDataByID["member_of"][number]
type Result = NonNullable<ArtistForm["member"]>[number]
export function initFormStore_Member(data: ArtistDataByID): Result[] {
	return data.type === "Person" ?
			data.member_of.map((m) => {
				if (m.group?.id) {
					return {
						artistID: m.group.id.toString(),
						groupMemberID: m.id.toString(),
						type: inferMemberType(data.type),
						name: m.group.name,
						isText: false,
						joinYear: m.join_year ,
						leaveYear: m.leave_year,
					}
				} else {
					return artistToTextMember(m, data.type)
				}
			})
		:	data.members.map((m) => {
				if (m.artist?.id) {
					return {
						artistID: m.artist.id.toString(),
						groupMemberID: m.id.toString(),
						type: inferMemberType(data.type),
						name: m.artist.name,
						isText: false,
						joinYear: m.join_year ,
						leaveYear: m.leave_year,
					}
				} else {
					return artistToTextMember(m, data.type)
				}
			})
}

function artistToTextMember(
	memberArtist: MemberArtist | MemberGroup,
	artistType: ArtistType
): Result {
	return {
		artistID: "",
		groupMemberID: memberArtist.id.toString(),
		type: inferMemberType(artistType),
		name: memberArtist.name ?? "",
		isText: true,
	}
}

function inferMemberType(type: ArtistType) {
	return type === "Person" ? "Group" : "Person"
}
