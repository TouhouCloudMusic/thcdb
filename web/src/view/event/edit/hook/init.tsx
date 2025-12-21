import type { Event } from "@thc/api"

import type { NewEventCorrection } from "~/domain/event"
import { DateWithPrecision } from "~/domain/shared"
import type { Location } from "~/domain/shared/schema"

type EventLocation = {
	city?: string | null
	country?: string | null
	province?: string | null
}

export type EventWithLocation = Event & {
	location?: EventLocation | null
}

export type EventFormInitProps =
	| {
			type: "new"
	  }
	| {
			type: "edit"
			event: EventWithLocation
	  }

function toEmptyLocation(): Location {
	return {
		country: undefined,
		province: undefined,
		city: undefined,
	}
}

function normalizeLocation(location?: EventLocation | null): Location {
	if (!location) {
		return toEmptyLocation()
	}

	return {
		country: location.country ?? undefined,
		province: location.province ?? undefined,
		city: location.city ?? undefined,
	}
}

export function toEventFormInitValue(
	props: EventFormInitProps,
): NewEventCorrection {
	if (props.type === "new") {
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
				location: toEmptyLocation(),
			},
		}
	}

	return {
		type: "Update",
		description: "",
		data: {
			name: props.event.name,
			short_description: props.event.short_description ?? undefined,
			description: props.event.description ?? undefined,
			start_date: DateWithPrecision.toInput(props.event.start_date),
			end_date: DateWithPrecision.toInput(props.event.end_date),
			alternative_names:
				props.event.alternative_names?.map((alt) => alt.name) ?? [],
			location: normalizeLocation(props.event.location),
		},
	}
}
