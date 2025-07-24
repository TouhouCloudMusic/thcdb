import type { SongCredit } from "~/api/song"

import type { GroupedSongCredit } from "."

export function groupByArtist(self: SongCredit[]): GroupedSongCredit[] {
	let arr: GroupedSongCredit[] = []
	// Map of id and index
	let map = new Map<number, number>()

	let lastIndex = -1
	for (const credit of self) {
		const artistId = credit.artist.id
		const role = credit.role

		const index = map.get(artistId)
		if (index !== undefined) {
			arr[index]!.roles.push(role)
		} else {
			arr.push({ artist: credit.artist, roles: [role] })
			lastIndex++
			map.set(artistId, lastIndex)
		}
	}

	return arr
}
