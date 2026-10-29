import { getInput, insert, remove, setInput } from "@formisch/solid"
import type { FieldStore } from "@formisch/solid"
import type { SimpleArtist } from "@thc/api"
import { batch } from "solid-js"

import type { ReleaseFormStore } from "./comp/types"
import type { ReleaseFormSchema } from "./schema"

type ArtistsField = FieldStore<
	typeof ReleaseFormSchema,
	["data", "tracks", number, "artists"]
>

export type ReleaseTracksModel = ReturnType<typeof createReleaseTracksModel>

function hasArtist(field: ArtistsField, id: number) {
	return field.input.some((artist) => artist.id === id)
}

function removeArtist(field: ArtistsField, id: number) {
	field.onInput(field.input.filter((artist) => artist.id !== id))
}

function addArtist(field: ArtistsField, artist: SimpleArtist) {
	if (hasArtist(field, artist.id)) return

	field.onInput([...field.input, artist])
}

export function createReleaseTracksModel(form: ReleaseFormStore) {
	const addTrack = (discIndex: number) =>
		insert(form, {
			path: ["data", "tracks"],
			initialInput: { disc_index: discIndex },
		})

	return { addTrack, hasArtist, addArtist, removeArtist }
}

export function removeTrack(form: ReleaseFormStore, removedIndex: number) {
	const credits = getInput(form, { path: ["data", "credits"] })

	batch(() => {
		for (
			let creditIndex = credits.length - 1;
			creditIndex >= 0;
			creditIndex -= 1
		) {
			const credit = credits[creditIndex]!
			if (!credit.on?.length) continue

			const remainingTracks = credit.on
				.filter((index) => index !== removedIndex)
				.map((index) => (index > removedIndex ? index - 1 : index))

			if (remainingTracks.length === 0) {
				remove(form, { path: ["data", "credits"], at: creditIndex })
			} else {
				setInput(form, {
					path: ["data", "credits", creditIndex, "on"],
					input: remainingTracks,
				})
			}
		}
		remove(form, { path: ["data", "tracks"], at: removedIndex })
	})
}
