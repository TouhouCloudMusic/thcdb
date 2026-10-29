import { createForm, getInput, useField } from "@formisch/solid"
import * as fc from "fast-check"
import { createRoot } from "solid-js"
import { assert, describe, expect, it } from "vitest"

import {
	createMockNamedReference,
	createMockSongReference,
} from "~/mock/reference"

import { createReleaseTracksModel, removeTrack } from "./model"
import { ReleaseFormSchema } from "./schema"

const firstSong = createMockSongReference(10)
const initialTracks = [
	{
		song: firstSong,
		disc_index: 0,
		artists: [createMockNamedReference(1), createMockNamedReference(2)],
	},
	{
		song: createMockSongReference(20),
		disc_index: 1,
		artists: [createMockNamedReference(3)],
	},
	{
		song: firstSong,
		disc_index: 2,
		artists: [createMockNamedReference(6)],
	},
]

function createEditor() {
	const form = createForm({
		schema: ReleaseFormSchema,
		initialInput: {
			data: {
				tracks: initialTracks,
				credits: [],
			},
		},
	})

	return {
		form,
		model: createReleaseTracksModel(form),
	}
}

function withTrackEditor(
	run: (editor: ReturnType<typeof createEditor>) => void,
) {
	createRoot((dispose) => {
		try {
			run(createEditor())
		} finally {
			dispose()
		}
	})
}

describe("createReleaseTracksModel()", () => {
	it.each([0, 1, 2])(
		"removing a track keeps the remaining tracks associated with their songs during further editing (%i)",
		(removedIndex) => {
			expect.hasAssertions()

			withTrackEditor(({ form, model }) => {
				const songs = [0, 1, 2].map((index) =>
					useField(form, { path: ["data", "tracks", index, "song"] }),
				)
				const expectedSongs = initialTracks.map((track) => track.song)
				const selectedSong = createMockSongReference(41)
				const [, secondSong] = songs
				assert(secondSong)
				secondSong.onInput(selectedSong)
				expectedSongs[1] = selectedSong

				model.addTrack(0)

				const newTrackSong = createMockSongReference(44)
				useField(form, { path: ["data", "tracks", 3, "song"] }).onInput(
					newTrackSong,
				)
				expectedSongs.push(newTrackSong)

				removeTrack(form, removedIndex)
				expectedSongs.splice(removedIndex, 1)

				expect(songs.map((field) => field.input)).toStrictEqual(expectedSongs)

				const replacementSong = createMockSongReference(45)
				const replacementField = songs[removedIndex]
				assert(replacementField)
				replacementField.onInput(replacementSong)
				expectedSongs[removedIndex] = replacementSong

				expect(
					getInput(form, { path: ["data", "tracks"] }).map(
						(track) => track.song,
					),
				).toStrictEqual(expectedSongs)

				expect(songs.map((field) => field.input)).toStrictEqual(expectedSongs)
			})
		},
	)

	it("track edits maintain unique, ordered artist lists", () => {
		expect.hasAssertions()
		const actions = fc.array(
			fc.record({
				kind: fc.constantFrom("add", "remove", "replaceTrack"),
				track: fc.integer({ min: 0, max: 2 }),
				artist: fc.integer({ min: 1, max: 6 }),
			}),
			{ minLength: 1, maxLength: 30 },
		)

		const replacementScenario = [
			{ kind: "replaceTrack", track: 2, artist: 4 },
			{ kind: "add", track: 2, artist: 4 },
			{ kind: "remove", track: 2, artist: 4 },
		]

		fc.assert(
			fc.property(actions, (artistActions) =>
				withTrackEditor(({ form, model }) => {
					const artists = [0, 1, 2].map((index) =>
						useField(form, { path: ["data", "tracks", index, "artists"] }),
					)
					const artistsById = new Map(
						[1, 2, 3, 4, 5, 6].map((id) => [id, createMockNamedReference(id)]),
					)
					const expected = [new Set([1, 2]), new Set([3]), new Set([6])]

					for (const { kind, track, artist } of artistActions) {
						const field = artists[track]
						const expectedArtists = expected[track]
						assert(field && expectedArtists)

						if (kind === "add") {
							const selectedArtist = artistsById.get(artist)
							assert(selectedArtist)
							model.addArtist(field, selectedArtist)
							expectedArtists.add(artist)
						} else if (kind === "remove") {
							model.removeArtist(field, artist)
							expectedArtists.delete(artist)
						} else {
							removeTrack(form, track)
							model.addTrack(0)
							expected.splice(track, 1)
							expected.push(new Set())
							useField(form, { path: ["data", "tracks", 2, "song"] }).onInput(
								createMockSongReference(40),
							)
						}

						for (const [index, ids] of expected.entries()) {
							const currentField = artists[index]
							assert(currentField)

							expect(
								currentField.input.map((reference) => reference.id),
							).toStrictEqual([...ids])
							for (const id of [1, 2, 3, 4, 5, 6]) {
								expect(model.hasArtist(currentField, id)).toBe(ids.has(id))
							}
						}
					}
				}),
			),
			{
				examples: [[replacementScenario]],
			},
		)
	})
})

describe("removeTrack()", () => {
	it("removing tracks preserves surviving credit targets and deletes credits that lose all assigned tracks", () => {
		expect.hasAssertions()
		createRoot((dispose) => {
			try {
				const form = createForm({
					schema: ReleaseFormSchema,
					initialInput: {
						data: {
							tracks: [
								{
									song: initialTracks[0]?.song,
									disc_index: 0,
									artists: [createMockNamedReference(1)],
								},
								{
									song: createMockSongReference(11),
									disc_index: 0,
									artists: [createMockNamedReference(1)],
								},
								{
									song: createMockSongReference(12),
									disc_index: 1,
									artists: [createMockNamedReference(1)],
								},
							],
							credits: [
								{
									artist: createMockNamedReference(1),
									role: createMockNamedReference(1),
									on: [0, 1, 2],
								},
								{
									artist: createMockNamedReference(1),
									role: createMockNamedReference(2),
									on: [2],
								},
								{
									artist: createMockNamedReference(1),
									role: createMockNamedReference(4),
									on: [2],
								},
								{
									artist: createMockNamedReference(2),
									role: createMockNamedReference(3),
									on: null,
								},
								{
									artist: createMockNamedReference(2),
									role: createMockNamedReference(5),
									on: [],
								},
							],
						},
					},
				})

				removeTrack(form, 1)
				const afterMiddleRemoval = getInput(form).data
				expect(
					afterMiddleRemoval.tracks.map((track) => track.song?.id),
				).toStrictEqual([10, 12])
				expect(afterMiddleRemoval.credits).toMatchObject([
					{ artist: { id: 1 }, role: { id: 1 }, on: [0, 1] },
					{ artist: { id: 1 }, role: { id: 2 }, on: [1] },
					{ artist: { id: 1 }, role: { id: 4 }, on: [1] },
					{ artist: { id: 2 }, role: { id: 3 }, on: null },
					{ artist: { id: 2 }, role: { id: 5 }, on: [] },
				])

				removeTrack(form, 1)
				const afterLastRemoval = getInput(form).data
				expect(
					afterLastRemoval.tracks.map((track) => track.song?.id),
				).toStrictEqual([10])
				expect(afterLastRemoval.credits).toMatchObject([
					{ artist: { id: 1 }, role: { id: 1 }, on: [0] },
					{ artist: { id: 2 }, role: { id: 3 }, on: null },
					{ artist: { id: 2 }, role: { id: 5 }, on: [] },
				])

				removeTrack(form, 0)

				const afterAllRemovals = getInput(form).data

				expect(afterAllRemovals).toMatchObject({
					tracks: [],
					credits: [
						{ artist: { id: 2 }, role: { id: 3 }, on: null },
						{ artist: { id: 2 }, role: { id: 5 }, on: [] },
					],
				})
			} finally {
				dispose()
			}
		})
	})
})
