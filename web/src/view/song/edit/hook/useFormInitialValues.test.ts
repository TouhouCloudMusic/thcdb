import { describe, expect, it } from "vitest"

import { useSongFormInitialValues } from "./useFormInitialValues"

describe(useSongFormInitialValues, () => {
	it("returns correct initial values for new song", () => {
		const result = useSongFormInitialValues({ type: "new" })

		expect(result).toEqual({
			type: "Create",
			description: "",
			data: {
				title: "",
				artists: [],
				languages: [],
				localized_titles: [],
				credits: [],
				relations: [],
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
					song: { id: 2, title: "Border of Life" },
					artist: { id: 12, name: "ZUN" },
					type: { id: 2, name: "Arrange" },
					description: "Shared motif",
				},
			],
		}

		const result = useSongFormInitialValues({
			type: "edit",
			song: songLike,
		})

		expect(result).toEqual({
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
						relation_type_id: 2,
						description: "Shared motif",
					},
				],
			},
		})
	})
})
