import type { DeepPartial } from "@formisch/solid"
import type { Tag } from "@thc/api"

import type { TagFormInput } from "../schema"

type Props =
	| {
			type: "new"
	  }
	| {
			type: "edit"
			tag: Tag
	  }

export function toTagFormInitValue(input: Props): DeepPartial<TagFormInput> {
	return input.type === "new"
		? {
				type: "Create",
				data: {
					alt_names: [],
					relations: [],
				},
			}
		: {
				type: "Update",
				data: {
					name: input.tag.name,
					type: input.tag.type,
					short_description: input.tag.short_description,
					description: input.tag.description,
					alt_names: input.tag.alt_names?.map((alt) => alt.name) ?? [],
					relations: input.tag.relations ?? [],
				},
			}
}
