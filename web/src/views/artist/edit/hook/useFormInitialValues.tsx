/* eslint-disable solid/reactivity */
import type { Artist } from "~/api/artist"
import type { NewArtistCorrection } from "~/api/artist/schema"

type Props =
	| {
			type: "new"
	  }
	| {
			type: "edit"
			artist: Artist
	  }

export function useArtistFormInitialValues(props: Props): NewArtistCorrection {
	return props.type == "new" ?
			{
				type: "Create",
				description: "",
				data: {
					name: "",
					artist_type: "Unknown" as const,
					localized_names: [],
					aliases: [],
					text_aliases: [],
					links: [],
					memberships: [],
				},
			}
		:	{
				type: "Update",
				description: "",
				data: {
					name: props.artist.name,
					artist_type: props.artist.artist_type,
					localized_names:
						props.artist.localized_names?.map((ln) => ({
							language_id: ln.language.id,
							name: ln.name,
						})) ?? [],
					aliases: props.artist.aliases ?? [],
					text_aliases: props.artist.text_aliases ?? [],
					start_date:
						props.artist.start_date ?
							{
								value: new Date(props.artist.start_date.value),
								precision: props.artist.start_date.precision,
							}
						:	undefined,
					end_date:
						props.artist.end_date ?
							{
								value: new Date(props.artist.end_date.value),
								precision: props.artist.end_date.precision,
							}
						:	undefined,
					links: props.artist.links ?? [],
					start_location: props.artist.start_location,
					current_location: props.artist.current_location,
					memberships:
						props.artist.memberships?.map((m) => ({
							artist_id: m.artist_id,
							roles: m.roles?.map((r) => r.id) ?? [],
							tenure: m.tenure ?? [],
						})) ?? [],
				},
			}
}
