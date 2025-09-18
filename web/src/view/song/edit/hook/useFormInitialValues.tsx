import type { Song } from "@thc/api"

import type { NewSongCorrection } from "~/domain/song"

export type EditSongPageProps = { type: "new" } | { type: "edit"; song: Song }

export function useSongFormInitialValues(
	props: EditSongPageProps,
): NewSongCorrection {
	return props.type === "new"
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
					title: props.song.title,
					artists: props.song.artists?.map((artist) => artist.id) ?? [],
					languages: props.song.languages?.map((lang) => lang.id) ?? [],
					localized_titles:
						props.song.localized_titles?.map((lt) => ({
							language_id: lt.language.id,
							name: lt.title,
						})) ?? [],
					credits:
						props.song.credits?.map((credit) => ({
							artist_id: credit.artist.id,
							role_id: credit.role?.id ?? undefined,
						})) ?? [],
				},
			}
}
