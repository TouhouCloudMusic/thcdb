import type { DeepPartial } from "@formisch/solid"
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
): DeepPartial<NewEventCorrection> {
	if (input.type === "new") {
		return {
			type: "Create",
			data: {
				alternative_names: [],
				links: [],
			},
		}
	}

	return {
		type: "Update",
		data: {
			name: input.event.name,
			short_description: input.event.short_description ?? undefined,
			description: input.event.description ?? undefined,
			start_date: DateWithPrecision.toInput(input.event.start_date),
			end_date: DateWithPrecision.toInput(input.event.end_date),
			alternative_names:
				input.event.alternative_names?.map((alt) => alt.name) ?? [],
			location: input.event.location ?? undefined,
			links: input.event.links ?? [],
		},
	}
}
