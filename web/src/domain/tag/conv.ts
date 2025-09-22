import type { Tag, TagRef } from "@thc/api"

export const toTagRef = (tag: Tag): TagRef => ({
	id: tag.id,
	name: tag.name,
	type: tag.type,
})
