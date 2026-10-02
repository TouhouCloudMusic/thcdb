import * as v from "valibot"
import { describe, expect, it } from "vitest"

import { NewCredit, NewRelease } from "./schema"

describe("release credit scope", () => {
	it("submits a release-wide credit when no tracks are selected", () => {
		expect.hasAssertions()
		for (const on of [undefined, null, []]) {
			expect(
				v.parse(NewCredit, { artist_id: 1, role_id: 2, on }),
			).toStrictEqual({
				artist_id: 1,
				role_id: 2,
				on: null,
			})
		}
	})

	it("allows the first track but rejects references outside the release", () => {
		expect.hasAssertions()
		const release = {
			title: "Release",
			release_type: "Album",
			artists: [1],
			catalog_nums: [],
			discs: [{}],
			events: [],
			localized_titles: [],
			links: [],
			tracks: [{ song_id: 3, disc_index: 0, artists: [1] }],
		}

		expect(
			v.parse(NewRelease, {
				...release,
				credits: [{ artist_id: 1, role_id: 2, on: [0] }],
			}).credits,
		).toStrictEqual([{ artist_id: 1, role_id: 2, on: [0] }])

		for (const index of [-1, 1]) {
			expect(
				v.safeParse(NewRelease, {
					...release,
					credits: [{ artist_id: 1, role_id: 2, on: [index] }],
				}).success,
				`track index ${index}`,
			).toBe(false)
		}
	})
})
