import { createForm, getInput } from "@formisch/solid"
import { createRoot } from "solid-js"
import * as v from "valibot"
import { describe, expect, it } from "vitest"

import { NewReleaseCorrection } from "~/domain/release"

import { removeTrack } from "./model"

describe("release track editing", () => {
	it("removing tracks preserves credit references and leaves the release submittable", () => {
		expect.hasAssertions()
		createRoot((dispose) => {
			try {
				const form = createForm({
					schema: NewReleaseCorrection,
					initialInput: {
						type: "Update",
						description: "Remove tracks",
						data: {
							title: "Release",
							release_type: "Album",
							artists: [1],
							catalog_nums: [],
							localized_titles: [],
							events: [],
							links: [],
							discs: [{ name: "Disc A" }, { name: "Disc B" }],
							tracks: [
								{ song_id: 10, disc_index: 0, artists: [1] },
								{ song_id: 11, disc_index: 0, artists: [1] },
								{ song_id: 12, disc_index: 1, artists: [1] },
							],
							credits: [
								{ artist_id: 1, role_id: 1, on: [0, 1, 2] },
								{ artist_id: 1, role_id: 2, on: [2] },
								{ artist_id: 2, role_id: 3, on: null },
							],
						},
					},
				})

				removeTrack(form, 1)
				const afterMiddleRemoval = v.parse(
					NewReleaseCorrection,
					getInput(form),
				).data
				expect(
					afterMiddleRemoval.tracks.map((track) => track.song_id),
				).toStrictEqual([10, 12])
				expect(afterMiddleRemoval.credits).toStrictEqual([
					{ artist_id: 1, role_id: 1, on: [0, 1] },
					{ artist_id: 1, role_id: 2, on: [1] },
					{ artist_id: 2, role_id: 3, on: null },
				])

				removeTrack(form, 1)
				const afterLastRemoval = v.parse(
					NewReleaseCorrection,
					getInput(form),
				).data
				expect(
					afterLastRemoval.tracks.map((track) => track.song_id),
				).toStrictEqual([10])
				expect(afterLastRemoval.credits).toStrictEqual([
					{ artist_id: 1, role_id: 1, on: [0] },
					{ artist_id: 1, role_id: 2, on: null },
					{ artist_id: 2, role_id: 3, on: null },
				])
			} finally {
				dispose()
			}
		})
	})
})
