/* eslint-disable solid/reactivity */
import type { Release } from "@thc/api"

import type { NewReleaseCorrection } from "~/domain/release"
import { DateWithPrecision } from "~/domain/shared"

export type EditReleasePageProps =
	| { type: "new" }
	| { type: "edit"; release: Release }

export function useReleaseFormInitialValues(
	props: EditReleasePageProps,
): NewReleaseCorrection {
	return props.type === "new"
		? {
				type: "Create",
				description: "",
				data: {
					title: "",
					release_type: "" as unknown as never,
					release_date: undefined,
					recording_date_start: undefined,
					recording_date_end: undefined,
					localized_titles: [],
					artists: [],
					events: [],
					catalog_nums: [],
					credits: [],
					discs: [{ name: "" }],
					tracks: [],
				},
			}
		: {
				type: "Update",
				description: "",
				data: {
					title: props.release.title,
					release_type: props.release.release_type,
					release_date: DateWithPrecision.toInput(props.release.release_date),
					recording_date_start: DateWithPrecision.toInput(
						props.release.recording_date_start,
					),
					recording_date_end: DateWithPrecision.toInput(
						props.release.recording_date_end,
					),
					localized_titles:
						props.release.localized_titles?.map((lt) => ({
							language_id: lt.language.id,
							title: lt.title,
						})) ?? [],
					artists: props.release.artists?.map((a) => a.id) ?? [],
					events: props.release.events?.map((e) => e.id) ?? [],
					catalog_nums: props.release.catalog_nums ?? [],
					credits:
						props.release.credits?.map((c) => ({
							role_id: c.role.id,
							on: c.on,
							artist_id: c.artist.id,
						})) ?? [],
					discs:
						props.release.discs?.map((d) => ({ name: d.name ?? undefined }))
						?? [],
					tracks:
						(() => {
							const discs = props.release.discs ?? []
							const indexById = new Map<number, number>()
							for (const [i, disc] of discs.entries()) {
								indexById.set(disc.id, i)
							}
							const tracks = props.release.tracks

							return tracks?.map((t) => ({
								artists: (t.artists ?? []).map((a) => a.id),
								disc_index:
									typeof t.disc_id === "number"
										? (indexById.get(t.disc_id) ?? 0)
										: 0,
								display_title: undefined,
								duration: t.duration ?? undefined,
								song_id: t.song.id,
								track_number: t.track_number ?? undefined,
							}))
						})() ?? [],
				},
			}
}
