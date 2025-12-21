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
	props: LabelFormInitProps,
): NewLabelCorrection {
	if (props.type === "new") {
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
			name: props.label.name,
			localized_names: props.label.localized_names.map((item) => ({
				language_id: item.language.id,
				name: item.name,
			})),
			founded_date: DateWithPrecision.toInput(props.label.founded_date),
			dissolved_date: DateWithPrecision.toInput(props.label.dissolved_date),
			founders: props.label.founders ?? [],
		},
	}
}
