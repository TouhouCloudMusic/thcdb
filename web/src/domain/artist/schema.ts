import * as v from "valibot"

import { DateWithPrecision } from "../shared"
import {
	EntityId,
	EntityIdent,
	Location,
	Year,
	NewLocalizedName,
	NewCorrection,
} from "../shared/schema"

export const ArtistType = v.union(
	(["Solo", "Multiple", "Unknown"] as const).map((x) => v.literal(x)),
)
export type ArtistType = v.InferInput<typeof ArtistType>

export const Tenure = v.object({
	join_year: v.nullish(Year),
	leave_year: v.nullish(Year),
})
export type Tenure = v.InferInput<typeof Tenure>

export const NewMembership = v.object({
	artist_id: EntityId,
	roles: v.array(EntityId),
	tenure: v.array(Tenure),
})
export type NewMembership = v.InferInput<typeof NewMembership>

export const NewArtist = v.object({
	name: EntityIdent,
	localized_names: v.nullish(v.array(NewLocalizedName)),
	artist_type: ArtistType,
	aliases: v.nullish(v.array(EntityId)),
	text_aliases: v.nullish(v.array(EntityIdent)),
	start_date: v.nullish(DateWithPrecision.Schema),
	end_date: v.nullish(DateWithPrecision.Schema),
	links: v.nullish(v.array(v.pipe(v.string(), v.url()))),
	start_location: v.nullish(Location),
	current_location: v.nullish(Location),
	memberships: v.nullish(v.array(NewMembership)),
})
export type NewArtist = v.InferInput<typeof NewArtist>

export const NewArtistCorrection = NewCorrection(NewArtist)
export type NewArtistCorrection = v.InferInput<typeof NewArtistCorrection>

export type ArtistCommonFilter = {
	limit?: number
	cursor?: number
	artist_type?: ArtistType[]
	exclusion?: number[]
}
