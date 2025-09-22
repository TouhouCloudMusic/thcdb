import * as v from "valibot"

import { EntityId, EntityIdent, NewCorrection } from "~/domain/shared/schema"

export const TagType = v.union(
	(["Descriptor", "Genre", "Movement", "Scene"] as const).map((x) =>
		v.literal(x),
	),
)

export const TagRelationType = v.union(
	(["Inherit", "Derive"] as const).map((x) => v.literal(x)),
)

export const NewTagRelation = v.object({
	related_tag_id: v.message(EntityId, "Tag not selected"),
	type: v.message(TagRelationType, "Relation type is required"),
})
export type NewTagRelation = v.InferInput<typeof NewTagRelation>

export const NewTag = v.object({
	name: v.message(EntityIdent, "Name is required and must be non-empty"),
	type: TagType,
	short_description: v.optional(v.string()),
	description: v.optional(v.string()),
	alt_names: v.optional(
		v.array(v.message(EntityIdent, "Name is required and must be non-empty")),
	),
	relations: v.optional(v.array(NewTagRelation)),
})
export type NewTag = v.InferInput<typeof NewTag>

export const NewTagCorrection = NewCorrection(NewTag)
export type NewTagCorrection = v.InferInput<typeof NewTagCorrection>
