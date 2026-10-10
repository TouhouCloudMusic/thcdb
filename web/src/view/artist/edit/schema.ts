import * as v from "valibot"

import { NewArtist, NewMembership } from "~/domain/artist/schema"
import { NewCorrection } from "~/domain/shared/schema"
import {
	ArtistReference,
	CreditRoleReference,
	LocalizedName,
} from "~/view/entity/schema"

const Membership = v.pipe(
	v.object({
		artist: ArtistReference,
		roles: v.array(CreditRoleReference),
		tenure: NewMembership.entries.tenure,
	}),
	v.transform(({ artist, roles, tenure }) => ({
		artist_id: artist.id,
		roles: roles.map((role) => role.id),
		tenure,
	})),
)

export const ArtistFormSchema = NewCorrection(
	v.pipe(
		v.object({
			...NewArtist.entries,
			aliases: v.array(ArtistReference),
			localized_names: v.nullish(v.array(LocalizedName)),
			memberships: v.array(Membership),
		}),
		v.transform(({ aliases, ...data }) => ({
			...data,
			aliases: aliases.map((artist) => artist.id),
		})),
	),
)

export type ArtistFormInput = v.InferInput<typeof ArtistFormSchema>
