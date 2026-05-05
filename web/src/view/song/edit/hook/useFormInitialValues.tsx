import type { Song } from "@thc/api"

import type { NewSongCorrection } from "~/domain/song"

export type SongFormInitialValueProps =
	| { type: "new" }
	| { type: "edit"; song: Song }

export function useSongFormInitialValues(
	input: SongFormInitialValueProps,
): NewSongCorrection {
	return input.type === "new"
		? {
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
			}
		: {
				type: "Update",
				description: "",
				data: {
					title: input.song.title,
					artists: input.song.artists?.map((artist) => artist.id) ?? [],
					languages: input.song.languages?.map((lang) => lang.id) ?? [],
					localized_titles:
						input.song.localized_titles?.map((lt) => ({
							language_id: lt.language.id,
							name: lt.title,
						})) ?? [],
					credits:
						input.song.credits?.map((credit) => ({
							artist_id: credit.artist.id,
							role_id: credit.role?.id ?? undefined,
						})) ?? [],
					relations:
						input.song.relations?.map((relation) => ({
							related_song_id: relation.song.id,
							relation_type_id: relation.type.id,
							description: relation.description,
						})) ?? [],
				},
			}
}
