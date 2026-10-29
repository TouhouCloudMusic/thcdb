import { createForm, getInput } from "@formisch/solid"
import { describe, expect, it } from "vitest"

import { createMockSongReference } from "~/mock/reference"
import { createMockRelease } from "~/mock/release"

import { ReleaseFormSchema } from "../schema"
import { useReleaseFormInitialValues } from "./useFormInitialValues"

describe("release form initialization", () => {
	it("new releases start with one unnamed disc", () => {
		expect(
			useReleaseFormInitialValues({ type: "new" }).data?.discs,
		).toStrictEqual([{ name: "" }])
	})

	it("tracks retain their disc when disc and track orders differ", () => {
		const firstSong = createMockSongReference(1001)
		const secondSong = createMockSongReference(1002)
		const release = createMockRelease(1, {
			discs: [
				{ id: 1, name: "Disc A" },
				{ id: 2, name: "Disc B" },
			],
			tracks: [
				{ id: 101, disc_id: 2, song: firstSong, artists: [] },
				{ id: 102, disc_id: 1, song: secondSong, artists: [] },
			],
		})
		const form = createForm({
			schema: ReleaseFormSchema,
			initialInput: useReleaseFormInitialValues({ type: "edit", release }),
		})

		expect(getInput(form).data.tracks).toMatchObject([
			{ song: firstSong, disc_index: 1 },
			{ song: secondSong, disc_index: 0 },
		])
	})
})
