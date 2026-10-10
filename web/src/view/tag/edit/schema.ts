import * as v from "valibot"

import { EntityId, NewCorrection } from "~/domain/shared/schema"
import { NewTag, NewTagRelation } from "~/domain/tag"
import type { TagRef } from "~/hey-api"
import { vTagRef } from "~/hey-api/valibot.gen"

interface RelatedTag extends Pick<TagRef, "id" | "name"> {
	id: TagRef["id"]
}
const relatedTag = v.object({ id: EntityId, name: vTagRef.entries.name })
const tag = v.custom<RelatedTag>((value) => v.is(relatedTag, value))

const TagRelation = v.pipe(
	v.object({
		tag: v.message(tag, "Tag not selected"),
		type: NewTagRelation.entries.type,
	}),
	v.transform((relation) => ({
		related_tag_id: relation.tag.id,
		type: relation.type,
	})),
)

export const TagFormSchema = NewCorrection(
	v.object({
		...NewTag.entries,
		relations: v.optional(v.array(TagRelation)),
	}),
)

export type TagFormInput = v.InferInput<typeof TagFormSchema>
