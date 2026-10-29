import { getInput } from "@formisch/solid"
import { describe, expect, it, vi } from "vitest"

import { createMockArtist } from "~/mock/artist"
import { createMockNamedReference } from "~/mock/reference"
import { EditArtistPage } from "~/view/artist/edit"
import { renderEditor } from "~/view/entity/test/edit_form"
import { getCapturedForm } from "~/view/entity/test/form_mock"

await vi.hoisted(() => import("~/view/entity/test/form_mock"))

const language = { id: 1, code: "ja", name: "Japanese" }
const relatedArtist = createMockNamedReference(2)
const role = createMockNamedReference(3)
const alias = createMockNamedReference(4)

const artist = createMockArtist(1, {
	artist_type: "Solo",
	localized_names: [{ language, name: "アーティスト" }],
	aliases: [alias],
	text_aliases: ["Another name"],
	start_date: { value: "1990-04-01", precision: "Month" },
	end_date: { value: "2025-01-01", precision: "Year" },
	start_location: { country: "Japan", province: "Kyoto", city: "Uji" },
	current_location: { country: "Germany", province: "Bavaria", city: "Munich" },
	memberships: [
		{
			artist: relatedArtist,
			roles: [role],
			tenure: [{ join_year: 2010, leave_year: 2020 }],
		},
	],
	links: ["https://example.com/artist"],
})

describe("artist editor", () => {
	it("opening an existing entity for editing preserves its editable values in the form", async () => {
		expect.hasAssertions()
		await renderEditor(
			() => (
				<EditArtistPage
					type="edit"
					artist={artist}
				/>
			),
			[language],
		)

		const expected = {
			type: "Update",
			description: "",
			data: {
				name: artist.name,
				artist_type: "Solo",
				localized_names: [{ language, name: "アーティスト" }],
				aliases: [alias],
				text_aliases: ["Another name"],
				start_date: {
					value: new Date("1990-04-01T00:00:00Z"),
					precision: "Month",
				},
				end_date: {
					value: new Date("2025-01-01T00:00:00Z"),
					precision: "Year",
				},
				start_location: { country: "Japan", province: "Kyoto", city: "Uji" },
				current_location: {
					country: "Germany",
					province: "Bavaria",
					city: "Munich",
				},
				memberships: [
					{
						artist: relatedArtist,
						roles: [role],
						tenure: [{ join_year: 2010, leave_year: 2020 }],
					},
				],
				links: ["https://example.com/artist"],
			},
		}
		const input = getInput(getCapturedForm())

		expect(input).toStrictEqual(expected)
	})
})
