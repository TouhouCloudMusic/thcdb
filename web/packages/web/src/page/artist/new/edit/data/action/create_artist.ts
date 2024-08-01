import e from "@touhouclouddb/database"
import { edgedbClient } from "~/database/server"
import { type ArtistFormHelper } from "./helpers"

export async function createArtist(helper: ArtistFormHelper) {
	const client = edgedbClient.withConfig({
		apply_access_policies: import.meta.env.DEV ? false : true,
	})
	const formData = helper.data

	const memberQueryData = e.json_array_unpack(
		e.json(
			helper.memberList?.map((data) => ({
				id: data.id,
				join_year: data.join_year,
				leave_year: data.leave_year,
			}))
		)
	)

	const memberQuery =
		helper.memberList ?
			e.op(
				"distinct",
				e.for(memberQueryData, (data) =>
					e.select(e.default.Artist, (artist) => ({
						filter: e.op(
							artist.id,
							"=",
							e.cast(e.uuid, e.json_get(data, "id"))
						),
						"@join_year": e.cast(e.int16, e.json_get(data, "join_year")),
						"@leave_year": e.cast(e.int16, e.json_get(data, "leave_year")),
					}))
				)
			)
		:	null

	const query = e.select(
		e.insert(e.default.Artist, {
			artist_type: formData.artist_type,
			name: formData.name,
			str_member: helper.strMemberList,
			members: memberQuery,
		}),
		() => ({
			id: true,
			app_id: true,
		})
	)

	try {
		return await client.transaction(async (tx) => {
			return await query.run(tx)
		})
	} catch (error) {
		console.log("query:", query.toEdgeQL())
		throw error
	}
}
