import type { Event } from "@thc/api"

import type { NewEventCorrection } from "~/domain/event"
import { DateWithPrecision } from "~/domain/shared"

export type EventWithLocation = Event & {
	location?: {
		city?: string | null
		country?: string | null
		province?: string | null
	} | null
}

export type EventFormInitProps =
	| {
			type: "new"
	  }
	| {
			type: "edit"
			event: EventWithLocation
	  }

export function toEventFormInitValue(
	input: EventFormInitProps,
): NewEventCorrection {
	if (input.type === "new") {
		return {
			type: "Create",
			description: "",
			data: {
				name: "",
				short_description: undefined,
				description: undefined,
				start_date: undefined,
				end_date: undefined,
				alternative_names: [],
				location: undefined,
			},
		}
	}

	return {
		type: "Update",
		description: "",
		data: {
			name: input.event.name,
			short_description: input.event.short_description ?? undefined,
			description: input.event.description ?? undefined,
			start_date: DateWithPrecision.toInput(input.event.start_date),
			end_date: DateWithPrecision.toInput(input.event.end_date),
			alternative_names:
				input.event.alternative_names?.map((alt) => alt.name) ?? [],
			location: input.event.location ?? undefined,
		},
	}
}
