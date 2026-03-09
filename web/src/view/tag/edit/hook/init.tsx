import type { Tag } from "@thc/api"

import type { NewTagCorrection } from "~/domain/tag"

type Props =
	| {
			type: "new"
	  }
	| {
			type: "edit"
			tag: Tag
	  }

export function toTagFormInitValue(input: Props): NewTagCorrection {
	return input.type === "new"
		? {
				type: "Create",
				description: "",
				data: {
					name: "",
					// @ts-expect-error
					type: "",
					short_description: undefined,
					description: undefined,
					alt_names: [],
					relations: [],
				},
			}
		: {
				type: "Update",
				description: "",
				data: {
					name: input.tag.name,
					type: input.tag.type,
					short_description: input.tag.short_description,
					description: input.tag.description,
					alt_names: input.tag.alt_names?.map((alt) => alt.name) ?? [],
					relations:
						input.tag.relations?.map((relation) => ({
							related_tag_id: relation.tag.id,
							type: relation.type,
						})) ?? [],
				},
			}
}
