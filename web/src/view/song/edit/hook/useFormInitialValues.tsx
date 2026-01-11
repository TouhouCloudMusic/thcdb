import type { Song } from "@thc/api"

import type { NewSongCorrection } from "~/domain/song"

export type EditSongPageProps = { type: "new" } | { type: "edit"; song: Song }

export function useSongFormInitialValues(
	input: EditSongPageProps,
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
				},
			}
}
