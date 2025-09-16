import * as v from "valibot"

import { DateWithPrecision } from "~/domain/shared"
import { EntityId, EntityIdent, NewCorrection } from "~/domain/shared/schema"

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

export const NewCredit = v.object({
	artist_id: EntityId,
	role_id: EntityId,
	on: v.nullish(v.array(EntityId)),
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

export const NewRelease = v.object({
	title: EntityIdent,
	release_type: ReleaseType,
	release_date: v.nullish(DateWithPrecision.Schema),
	recording_date_start: v.nullish(DateWithPrecision.Schema),
	recording_date_end: v.nullish(DateWithPrecision.Schema),
	localized_titles: v.array(NewLocalizedTitle),
	artists: v.pipe(
		v.array(EntityId),
		v.minLength(1, "release must have artists"),
	),
	events: v.array(EntityId),
	catalog_nums: v.array(CatalogNumber),
	credits: v.array(NewCredit),
	discs: v.array(NewDisc),
	tracks: v.array(NewTrack),
})
export type NewRelease = v.InferInput<typeof NewRelease>

export const NewReleaseCorrection = NewCorrection(NewRelease)
export type NewReleaseCorrection = v.InferInput<typeof NewReleaseCorrection>
