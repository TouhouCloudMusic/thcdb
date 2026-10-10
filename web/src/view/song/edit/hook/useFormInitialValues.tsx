import type { DeepPartial } from "@formisch/solid"
import type { Song } from "@thc/api"

import type { SongFormInput } from "../schema"

export type SongFormInitialValueProps =
	| { type: "new" }
	| { type: "edit"; song: Song }

export function useSongFormInitialValues(
	input: SongFormInitialValueProps,
): DeepPartial<SongFormInput> {
	return input.type === "new"
		? {
				type: "Create",
				data: {
					links: [],
				},
			}
		: {
				type: "Update",
				data: {
					title: input.song.title,
					artists: input.song.artists,
					languages: input.song.languages,
					localized_titles: input.song.localized_titles?.map((lt) => ({
						language: lt.language,
						name: lt.title,
					})),
					credits: input.song.credits?.map((credit) => ({
						artist: credit.artist,
						role: credit.role ?? undefined,
					})),
					relations: input.song.relations?.map((relation) => ({
						song: relation.song,
						direction: relation.direction,
						relation_type: relation.type,
						description: relation.description,
					})),
					links: input.song.links ?? [],
				},
			}
}
