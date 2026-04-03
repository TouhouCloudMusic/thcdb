import type { SongRelation } from "@thc/api"

export type SongInfoRelationItemData = {
	songId: string
	songTitle: string
	artist?: {
		id: string
		name: string
	}
	relationTypeName: string
	description: string
}

export function toSongInfoRelationItemData(
	relation: SongRelation,
): SongInfoRelationItemData {
	return {
		songId: relation.song.id.toString(),
		songTitle: relation.song.title,
		artist: relation.artist
			? {
					id: relation.artist.id.toString(),
					name: relation.artist.name,
				}
			: undefined,
		relationTypeName: relation.type.name,
		description: relation.description,
	}
}
