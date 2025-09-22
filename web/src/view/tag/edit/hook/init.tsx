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

export function toTagFormInitValue(props: Props): NewTagCorrection {
	return props.type === "new"
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
					name: props.tag.name,
					type: props.tag.type,
					short_description: props.tag.short_description ?? undefined,
					description: props.tag.description ?? undefined,
					alt_names: props.tag.alt_names?.map((alt) => alt.name) ?? [],
					relations:
						props.tag.relations?.map((relation) => ({
							related_tag_id: relation.tag.id,
							type: relation.type,
						})) ?? [],
				},
			}
}
