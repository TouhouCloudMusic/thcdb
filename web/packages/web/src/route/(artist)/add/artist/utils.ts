import { ArtistByID } from "~/database/artist/find_artist_by_id"
import { ArtistForm } from "./type"
import { ArtistType } from "~/database/artist/type"

type MemberArtist = ArtistByID["members"][number]
type MemberGroup = ArtistByID["member_of"][number]
type Result = NonNullable<ArtistForm["member"]>[number]
export function initFormStore_Member(data: ArtistByID): Result[] {
	return data.type === "Person" ?
			data.member_of.map((m) => {
				if (m.group?.id) {
					return {
						artistID: m.group.id.toString(),
						groupMemberID: m.id.toString(),
						type: reverseArtistType(data.type),
						name: m.group.name,
						isText: false,
						joinYear: m.join_year,
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
						type: reverseArtistType(data.type),
						name: m.artist.name,
						isText: false,
						joinYear: m.join_year,
						leaveYear: m.leave_year,
					}
				} else {
					return artistToTextMember(m, data.type)
				}
			})
}

function artistToTextMember(
	memberArtist: MemberArtist  ,
	artistType: ArtistType
): Result {
	return {
		app_id: "",
		artist_type: reverseArtistType(artistType),
		name: memberArtist.name ?? "",
		isStr: true,
	}
}

function reverseArtistType(type: ArtistType) {
	return type === "Person" ? "Group" : "Person"
}
