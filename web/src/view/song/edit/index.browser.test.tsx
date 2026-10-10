import { getInput } from "@formisch/solid"
import { describe, expect, it, vi } from "vitest"

import {
	createMockNamedReference,
	createMockSongReference,
} from "~/mock/reference"
import { createMockSong } from "~/mock/song"
import { renderEditor } from "~/view/entity/test/edit_form"
import { getCapturedForm } from "~/view/entity/test/form_mock"
import { EditSongPage } from "~/view/song/edit"

await vi.hoisted(() => import("~/view/entity/test/form_mock"))

const language = { id: 1, code: "ja", name: "Japanese" }
const relatedArtist = createMockNamedReference(2)
const role = createMockNamedReference(3)
const sourceSong = createMockSongReference(6)

const song = createMockSong(5, {
	artists: [relatedArtist],
	languages: [language],
	localized_titles: [{ language, title: "曲" }],
	credits: [{ artist: relatedArtist, role }],
	relations: [
		{
			song: { ...sourceSong, artists: [relatedArtist] },
			direction: "Source",
			type: "Arrangement",
			description: "Original melody",
		},
	],
	links: ["https://example.com/song"],
})

describe("song editor", () => {
	it("opening an existing song preserves its editable values", async () => {
		expect.hasAssertions()
		await renderEditor(
			() => (
				<EditSongPage
					type="edit"
					song={song}
				/>
			),
			[language],
		)

		expect(getInput(getCapturedForm())).toStrictEqual({
			type: "Update",
			description: "",
			data: {
				title: song.title,
				artists: [relatedArtist],
				languages: [language],
				localized_titles: [{ language, name: "曲" }],
				credits: [{ artist: relatedArtist, role }],
				relations: [
					{
						song: sourceSong,
						direction: "Source",
						relation_type: "Arrangement",
						description: "Original melody",
					},
				],
				links: ["https://example.com/song"],
			},
		})
	})
})
