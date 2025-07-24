import * as v from "valibot"

import type { Expand, SafeOmit, Eq, If, Extend } from "~/types"
import type { ExternalSchema } from "~/types/valibot"

import type { OpenApiSchema } from ".."
import { NewCorrection } from "../correction"
import { DateWithPrecision } from "../shared"
import {
	EntityId,
	EntityIdent,
	Location,
	Year,
	NewLocalizedName,
} from "../shared/schema"

type o_NewArtistCorrection = OpenApiSchema["NewCorrection_NewArtist"]

type o_NewArtist = o_NewArtistCorrection["data"]

type o_ArtistType = OpenApiSchema["ArtistType"]
type o_NewMembership = OpenApiSchema["NewMembership"]
type o_Tenure = OpenApiSchema["Tenure"]

export const ArtistType = v.union(
	(["Solo", "Multiple", "Unknown"] as const).map((x) => v.literal(x)),
)
export type ArtistType = If<
	Eq<o_ArtistType, v.InferInput<typeof ArtistType>>,
	o_ArtistType,
	never
>
export const Tenure = v.object({
	join_year: v.nullish(Year),
	leave_year: v.nullish(Year),
} satisfies ExternalSchema<o_Tenure>)
type v_Tenure = v.InferInput<typeof Tenure>
export type Tenure = If<Eq<o_Tenure, v_Tenure>, o_Tenure, never>

export const NewMembership = v.object({
	artist_id: EntityId,
	roles: v.array(EntityId),
	tenure: v.array(Tenure),
} satisfies ExternalSchema<o_NewMembership>)
export type NewMembership = v.InferInput<typeof NewMembership>

export type NewArtist = Expand<
	SafeOmit<o_NewArtist, "start_date" | "end_date"> &
		Partial<{
			start_date: DateWithPrecision.In | null
			end_date: DateWithPrecision.In | null
		}>
>
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
} satisfies ExternalSchema<NewArtist, o_NewArtist>)

export const NewArtistCorrection = NewCorrection(NewArtist)
export type NewArtistCorrection = v.InferInput<typeof NewArtistCorrection>
export type NewArtistCorrectionOut = If<
	Extend<v.InferOutput<typeof NewArtistCorrection>, o_NewArtistCorrection>,
	o_NewArtistCorrection,
	never
>

export type SimpleArtist = OpenApiSchema["SimpleArtist"]
