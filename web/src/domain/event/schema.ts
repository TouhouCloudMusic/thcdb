import * as v from "valibot"

import { DateWithPrecision } from "~/domain/shared"
import { EntityIdent, Location, NewCorrection } from "~/domain/shared/schema"

export const NewEvent = v.object({
	name: v.message(EntityIdent, "Name is required and must be non-empty"),
	short_description: v.optional(v.string()),
	description: v.optional(v.string()),
	start_date: v.nullish(DateWithPrecision.Schema),
	end_date: v.nullish(DateWithPrecision.Schema),
	alternative_names: v.optional(
		v.array(v.message(EntityIdent, "Name is required and must be non-empty")),
	),
	location: v.nullish(Location),
})
export type NewEvent = v.InferInput<typeof NewEvent>

export const NewEventCorrection = NewCorrection(NewEvent)
export type NewEventCorrection = v.InferInput<typeof NewEventCorrection>
