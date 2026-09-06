import * as v from "valibot"

import {
	EntityId,
	EntityIdent,
	HttpUrl,
	NewCorrection,
	NewLocalizedName,
} from "~/domain/shared/schema"

export const NewSongCredit = v.object({
	artist_id: v.message(EntityId, "Artist not selected"),
	role_id: v.optional(EntityId),
})

export type NewSongCredit = v.InferInput<typeof NewSongCredit>

export const NewSongRelation = v.object({
	related_song_id: v.message(EntityId, "Related song not selected"),
	relation_type_id: v.message(EntityId, "Relation type not selected"),
	description: v.string(),
})

export type NewSongRelation = v.InferInput<typeof NewSongRelation>

const SongRelations = v.pipe(
	v.array(NewSongRelation),
	v.check((relations) => {
		const relatedSongIds = new Set(
			relations.map((relation) => relation.related_song_id),
		)
		return relatedSongIds.size === relations.length
	}, "Duplicate related song"),
)

export const NewSong = v.object({
	title: v.message(EntityIdent, "Title is required and must be non-empty"),
	artists: v.array(EntityId),
	languages: v.array(v.message(EntityId, "Language not selected")),
	localized_titles: v.array(NewLocalizedName),
	credits: v.array(NewSongCredit),
	relations: SongRelations,
	links: v.nullish(v.array(HttpUrl)),
})
export type NewSong = v.InferInput<typeof NewSong>

export const NewSongCorrection = NewCorrection(NewSong)
export type NewSongCorrection = v.InferInput<typeof NewSongCorrection>
