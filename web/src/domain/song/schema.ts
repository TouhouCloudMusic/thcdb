import * as v from "valibot"

import {
	EntityId,
	EntityIdent,
	NewCorrection,
	NewLocalizedName,
} from "~/domain/shared/schema"

export const NewSongCredit = v.object({
	artist_id: v.message(EntityId, "Artist not selected"),
	role_id: v.optional(EntityId),
})

export type NewSongCredit = v.InferInput<typeof NewSongCredit>

export const NewSong = v.object({
	title: v.message(EntityIdent, "Title is required and must be non-empty"),
	artists: v.array(EntityId),
	languages: v.array(v.message(EntityId, "Language not selected")),
	localized_titles: v.array(NewLocalizedName),
	credits: v.array(NewSongCredit),
})
export type NewSong = v.InferInput<typeof NewSong>

export const NewSongCorrection = NewCorrection(NewSong)
export type NewSongCorrection = v.InferInput<typeof NewSongCorrection>
