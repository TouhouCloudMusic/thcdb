import { describe, expect, it } from "vitest"

import { toSongInfoRelationItemData } from "./SongInfoRelations.data"

describe(toSongInfoRelationItemData, () => {
	it("maps relation artist when available", () => {
		expect(
			toSongInfoRelationItemData({
				song: { id: 100, title: "U.N. Owen Was Her?" },
				artist: { id: 1, name: "ZUN" },
				type: { id: 1, name: "Original" },
				description: "Primary melodic source for this arrangement.",
			}),
		).toEqual({
			songId: "100",
			songTitle: "U.N. Owen Was Her?",
			artist: {
				id: "1",
				name: "ZUN",
			},
			relationTypeName: "Original",
			description: "Primary melodic source for this arrangement.",
		})
	})

	it("keeps relation artist empty when unavailable", () => {
		expect(
			toSongInfoRelationItemData({
				song: { id: 101, title: "Locked Girl" },
				type: { id: 2, name: "Remix" },
				description: "",
			}),
		).toEqual({
			songId: "101",
			songTitle: "Locked Girl",
			artist: undefined,
			relationTypeName: "Remix",
			description: "",
		})
	})
})
