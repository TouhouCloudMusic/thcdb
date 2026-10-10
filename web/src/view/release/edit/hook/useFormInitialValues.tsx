import type { DeepPartial } from "@formisch/solid"
/* eslint-disable solid/reactivity */
import type { Release } from "@thc/api"

import { DateWithPrecision } from "~/domain/shared"

import type { ReleaseFormInput } from "../schema"

export type ReleaseFormInitialValueProps =
	| { type: "new" }
	| { type: "edit"; release: Release }

export function useReleaseFormInitialValues(
	props: ReleaseFormInitialValueProps,
): DeepPartial<ReleaseFormInput> {
	return props.type === "new"
		? {
				type: "Create",
				data: {
					discs: [{ name: "" }],
				},
			}
		: {
				type: "Update",
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
					localized_titles: props.release.localized_titles,
					artists: props.release.artists,
					events: props.release.events,
					catalog_nums: props.release.catalog_nums?.map((catalogNum) => ({
						catalog_number: catalogNum.catalog_number,
						label: catalogNum.label ?? undefined,
					})),
					credits: props.release.credits,
					discs: props.release.discs?.map((d) => ({
						name: d.name ?? undefined,
					})),
					tracks: (() => {
						const discs = props.release.discs ?? []
						const indexById = new Map<number, number>()
						for (const [i, disc] of discs.entries()) {
							indexById.set(disc.id, i)
						}
						const tracks = props.release.tracks

						return tracks?.map((t) => ({
							artists: t.artists,
							disc_index:
								typeof t.disc_id === "number"
									? (indexById.get(t.disc_id) ?? 0)
									: 0,
							display_title: t.display_title ?? undefined,
							duration: t.duration ?? undefined,
							song: t.song,
							track_number: t.track_number ?? undefined,
						}))
					})(),
					links: props.release.links,
				},
			}
}
