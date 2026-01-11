import type { Label } from "@thc/api"

import type { NewLabelCorrection } from "~/domain/label"
import { DateWithPrecision } from "~/domain/shared"

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
): NewLabelCorrection {
	if (input.type === "new") {
		return {
			type: "Create",
			description: "",
			data: {
				name: "",
				localized_names: [],
				founded_date: undefined,
				dissolved_date: undefined,
				founders: [],
			},
		}
	}

	return {
		type: "Update",
		description: "",
		data: {
			name: input.label.name,
			localized_names: input.label.localized_names.map((item) => ({
				language_id: item.language.id,
				name: item.name,
			})),
			founded_date: DateWithPrecision.toInput(input.label.founded_date),
			dissolved_date: DateWithPrecision.toInput(input.label.dissolved_date),
			founders: input.label.founders ?? [],
		},
	}
}
