import * as v from "valibot"

import { DateWithPrecision } from "~/domain/shared"
import {
	EntityId,
	EntityIdent,
	HttpUrl,
	NewCorrection,
} from "~/domain/shared/schema"

import { RELEASE_TYPES } from "./constants"

export const ReleaseType = v.union(RELEASE_TYPES.map((x) => v.literal(x)))
export type ReleaseType = v.InferInput<typeof ReleaseType>

export const NewLocalizedTitle = v.object({
	language_id: EntityId,
	title: EntityIdent,
})
export type NewLocalizedTitle = v.InferInput<typeof NewLocalizedTitle>

export const CatalogNumber = v.object({
	catalog_number: v.string(),
	label_id: v.nullish(EntityId),
})
export type CatalogNumber = v.InferInput<typeof CatalogNumber>

export const TrackIndex = v.pipe(
	v.number(),
	v.integer(),
	v.minValue(0),
	v.maxValue(32_767),
)

export const CreditScope = v.pipe(
	v.nullish(v.array(TrackIndex), null),
	v.transform((indices) =>
		indices === null || indices.length === 0 ? null : indices,
	),
	v.nullable(v.tupleWithRest([TrackIndex], TrackIndex)),
)
export type CreditScope = v.InferOutput<typeof CreditScope>

export const NewCredit = v.object({
	artist_id: EntityId,
	role_id: EntityId,
	on: CreditScope,
})
export type NewCredit = v.InferInput<typeof NewCredit>

export const NewDisc = v.object({
	name: v.nullish(v.string()),
})
export type NewDisc = v.InferInput<typeof NewDisc>

export const NewTrack = v.object({
	artists: v.array(EntityId),
	disc_index: v.number(),
	display_title: v.nullish(v.string()),
	duration: v.nullish(v.number()),
	song_id: EntityId,
	track_number: v.nullish(v.string()),
})
export type NewTrack = v.InferInput<typeof NewTrack>

export const NewRelease = v.pipe(
	v.object({
		title: EntityIdent,
		release_type: ReleaseType,
		release_date: v.nullish(DateWithPrecision.Schema),
		recording_date_start: v.nullish(DateWithPrecision.Schema),
		recording_date_end: v.nullish(DateWithPrecision.Schema),
		localized_titles: v.array(NewLocalizedTitle),
		artists: v.pipe(
			v.array(EntityId),
			v.minLength(1, "Release must have artists"),
		),
		events: v.array(EntityId),
		catalog_nums: v.array(CatalogNumber),
		credits: v.array(NewCredit),
		discs: v.array(NewDisc),
		tracks: v.array(NewTrack),
		links: v.array(HttpUrl),
	}),
	v.forward(
		v.check(
			(release) =>
				release.credits.every(
					(credit) =>
						credit.on === null
						|| credit.on.every((index) => index < release.tracks.length),
				),
			"Credit track index is out of bounds",
		),
		["credits"],
	),
)
export type NewRelease = v.InferInput<typeof NewRelease>

export const NewReleaseCorrection = NewCorrection(NewRelease)
export type NewReleaseCorrection = v.InferInput<typeof NewReleaseCorrection>
