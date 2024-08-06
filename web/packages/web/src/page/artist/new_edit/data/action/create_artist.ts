import { edgedbClient } from "~/database/server"
import { type ArtistFormHelper, type ArtistQueryReturnShape } from "./helpers"

export async function createArtist({
	isGroup,
	isPerson,
	insertGroupQuery,
	insertPersonQuery,
	linkMemberOfQuery,
	hasLinkMemberList,
}: ArtistFormHelper): Promise<ArtistQueryReturnShape> {
	const client = edgedbClient
	const query = isGroup ? insertGroupQuery : insertPersonQuery

	try {
		return await client.transaction(async (tx) => {
			const res = await query.run(tx)

			if (isPerson && hasLinkMemberList) {
				await linkMemberOfQuery(res.id).run(tx)
			}
			return res
		})
	} catch (error) {
		console.log("Query:", query.toEdgeQL())
		throw error
	}
}
