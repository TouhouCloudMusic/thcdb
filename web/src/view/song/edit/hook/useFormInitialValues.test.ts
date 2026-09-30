import { describe, expect, it } from "vitest"

import { useSongFormInitialValues } from "./useFormInitialValues"

describe("song form initialization", () => {
	it("returns correct initial values for new song", () => {
		const result = useSongFormInitialValues({ type: "new" })

		expect(result).toStrictEqual({
			type: "Create",
			description: "",
			data: {
				title: "",
				artists: [],
				languages: [],
				localized_titles: [],
				credits: [],
				relations: [],
				links: [],
			},
		})
	})

	it("maps edit song to initial values", () => {
		const songLike = {
			id: 1,
			title: "Necro Fantasia",
			artists: [{ id: 10, name: "ZUN" }],
			languages: [{ id: 20, code: "ja", name: "Japanese" }],
			localized_titles: [
				{
					language: { id: 21, code: "en", name: "English" },
					title: "Necro Fantasia",
				},
			],
			credits: [
				{
					artist: { id: 11, name: "Arranger A" },
					role: { id: 31, name: "Arranger" },
				},
			],
			relations: [
				{
					song: {
						id: 2,
						title: "Border of Life",
						artists: [{ id: 12, name: "ZUN" }],
						release: null,
					},
					direction: "Derived" as const,
					type: "Arrangement" as const,
					description: "Shared motif",
				},
				{
					song: {
						id: 3,
						title: "Necro Fantasia Remix",
						artists: [],
						release: null,
					},
					direction: "Source" as const,
					type: "Remix" as const,
					description: "",
				},
			],
			links: ["https://example.com/songs/1"],
		}

		const result = useSongFormInitialValues({
			type: "edit",
			song: songLike,
		})

		expect(result).toStrictEqual({
			type: "Update",
			description: "",
			data: {
				title: "Necro Fantasia",
				artists: [10],
				languages: [20],
				localized_titles: [
					{
						language_id: 21,
						name: "Necro Fantasia",
					},
				],
				credits: [{ artist_id: 11, role_id: 31 }],
				relations: [
					{
						related_song_id: 2,
						direction: "Derived",
						relation_type: "Arrangement",
						description: "Shared motif",
					},
					{
						related_song_id: 3,
						direction: "Source",
						relation_type: "Remix",
						description: "",
					},
				],
				links: ["https://example.com/songs/1"],
			},
		})
	})
})
