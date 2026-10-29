import { getInput } from "@formisch/solid"
import { describe, expect, it, vi } from "vitest"

import {
	createMockNamedReference,
	createMockSongReference,
} from "~/mock/reference"
import { createMockRelease } from "~/mock/release"
import { renderEditor } from "~/view/entity/test/edit_form"
import { getCapturedForm } from "~/view/entity/test/form_mock"
import { EditReleasePage } from "~/view/release/edit"

await vi.hoisted(() => import("~/view/entity/test/form_mock"))

const language = { id: 1, code: "ja", name: "Japanese" }
const relatedArtist = createMockNamedReference(2)
const role = createMockNamedReference(3)
const song = createMockSongReference(5)

const release = createMockRelease(7, {
	release_type: "Album",
	localized_titles: [{ language, title: "アルバム" }],
	release_date: { value: "2020-01-02", precision: "Day" },
	recording_date_start: { value: "2019-05-01", precision: "Month" },
	recording_date_end: { value: "2019-01-01", precision: "Year" },
	artists: [relatedArtist],
	events: [{ id: 8, name: "Convention" }],
	catalog_nums: [
		{ catalog_number: "CAT-001", label: { id: 9, name: "Label" } },
	],
	credits: [{ artist: relatedArtist, role, on: [0] }],
	discs: [{ id: 10, name: "Main disc" }],
	tracks: [
		{
			id: 11,
			disc_id: 10,
			song,
			display_title: "Track title",
			track_number: "A1",
			duration: 185_123,
			artists: [relatedArtist],
		},
	],
	links: ["https://example.com/release"],
})

describe("release editor", () => {
	it("opening an existing release preserves its editable values", async () => {
		expect.hasAssertions()
		await renderEditor(
			() => (
				<EditReleasePage
					type="edit"
					release={release}
				/>
			),
			[language],
		)

		expect(getInput(getCapturedForm())).toStrictEqual({
			type: "Update",
			description: "",
			data: {
				title: release.title,
				release_type: "Album",
				localized_titles: [{ language, title: "アルバム" }],
				release_date: {
					value: new Date("2020-01-02T00:00:00Z"),
					precision: "Day",
				},
				recording_date_start: {
					value: new Date("2019-05-01T00:00:00Z"),
					precision: "Month",
				},
				recording_date_end: {
					value: new Date("2019-01-01T00:00:00Z"),
					precision: "Year",
				},
				artists: [relatedArtist],
				events: [{ id: 8, name: "Convention" }],
				catalog_nums: [
					{ catalog_number: "CAT-001", label: { id: 9, name: "Label" } },
				],
				credits: [{ artist: relatedArtist, role, on: [0] }],
				discs: [{ name: "Main disc" }],
				tracks: [
					{
						artists: [relatedArtist],
						disc_index: 0,
						display_title: "Track title",
						duration: 185_123,
						song,
						track_number: "A1",
					},
				],
				links: ["https://example.com/release"],
			},
		})
	})
})
