import { edgedbClient } from "~/database/server"
import { type ArtistFormHelper, type ArtistQueryReturnShape } from "./helpers"

export async function updateArtist({
	isPerson,
	updateGroupQuery,
	updatePersonQuery,
	linkMemberOfQuery,
	hasLinkMemberList,
	unlinkMemberOfQuery,
	hasUnlinkMemberOfList,
}: ArtistFormHelper): Promise<ArtistQueryReturnShape> {
	const client = edgedbClient
	const query = isPerson ? updatePersonQuery : updateGroupQuery

	try {
		return await client.transaction(async (tx) => {
			const res = await query.run(tx)
			if (!res) throw new Error("update failed")

			if (isPerson) {
				if (hasLinkMemberList) {
					await linkMemberOfQuery(res.id).run(tx)
				}
				if (hasUnlinkMemberOfList) {
					await unlinkMemberOfQuery(res.id).run(tx)
				}
			}
			return res
		})
	} catch (error) {
		console.log("Query:", query.toEdgeQL())
		throw error
	}
}
