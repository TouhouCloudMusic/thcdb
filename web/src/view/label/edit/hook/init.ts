import type { DeepPartial } from "@formisch/solid"
import type { Label } from "@thc/api"

import { DateWithPrecision } from "~/domain/shared"

import type { LabelFormInput } from "../schema"

export type LabelFormInitProps =
	| {
			type: "new"
	  }
	| {
			type: "edit"
			label: Label
	  }

export function toLabelFormInitValue(
	input: LabelFormInitProps,
): DeepPartial<LabelFormInput> {
	if (input.type === "new") {
		return {
			type: "Create",
			data: {
				localized_names: [],
				founders: [],
				links: [],
			},
		}
	}

	return {
		type: "Update",
		data: {
			name: input.label.name,
			localized_names: input.label.localized_names,
			founded_date: DateWithPrecision.toInput(input.label.founded_date),
			dissolved_date: DateWithPrecision.toInput(input.label.dissolved_date),
			founders: input.label.founders,
			links: input.label.links,
		},
	}
}
