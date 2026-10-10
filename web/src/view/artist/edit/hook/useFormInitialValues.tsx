import type { DeepPartial } from "@formisch/solid"
import type { Artist } from "@thc/api"

import type { ArtistFormInput } from "../schema"

type Props =
	| {
			type: "new"
	  }
	| {
			type: "edit"
			artist: Artist
	  }

export function useArtistFormInitialValues(
	input: Props,
): DeepPartial<ArtistFormInput> {
	return input.type == "new"
		? {
				type: "Create",
				data: {
					artist_type: "Unknown",
					localized_names: [],
					aliases: [],
					text_aliases: [],
					links: [],
					memberships: [],
				},
			}
		: {
				type: "Update",
				data: {
					name: input.artist.name,
					artist_type: input.artist.artist_type,
					localized_names: input.artist.localized_names ?? [],
					aliases: input.artist.aliases ?? [],
					text_aliases: input.artist.text_aliases ?? [],
					start_date: input.artist.start_date
						? {
								value: new Date(input.artist.start_date.value),
								precision: input.artist.start_date.precision,
							}
						: undefined,
					end_date: input.artist.end_date
						? {
								value: new Date(input.artist.end_date.value),
								precision: input.artist.end_date.precision,
							}
						: undefined,
					links: input.artist.links ?? [],
					start_location: input.artist.start_location,
					current_location: input.artist.current_location,
					memberships:
						input.artist.memberships?.map((m) => ({
							artist: m.artist,
							roles: m.roles ?? [],
							tenure: m.tenure ?? [],
						})) ?? [],
				},
			}
}
