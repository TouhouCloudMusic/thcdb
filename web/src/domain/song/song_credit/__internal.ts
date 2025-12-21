import type { SongCredit } from "@thc/api"

import type { GroupedSongCredit } from "."

export function groupByArtist(self: SongCredit[]): GroupedSongCredit[] {
	return self.reduce<GroupedSongCredit[]>((ret, credit) => {
		const existing = ret.find((g) => g.artist.id === credit.artist.id)
		if (existing) {
			if (credit.role) {
				existing.roles.push(credit.role)
			}
		} else {
			ret.push({
				artist: credit.artist,
				roles: credit.role ? [credit.role] : [],
			})
		}
		return ret
	}, [])
}
