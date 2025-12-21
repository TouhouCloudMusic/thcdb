import * as v from "valibot"

import { DateWithPrecision } from "~/domain/shared"
import {
	EntityId,
	EntityIdent,
	NewCorrection,
	NewLocalizedName,
} from "~/domain/shared/schema"

export const NewLabel = v.object({
	name: EntityIdent,
	localized_names: v.nullish(v.array(NewLocalizedName)),
	founded_date: v.nullish(DateWithPrecision.Schema),
	dissolved_date: v.nullish(DateWithPrecision.Schema),
	founders: v.nullish(v.array(EntityId)),
})
export type NewLabel = v.InferInput<typeof NewLabel>

export const NewLabelCorrection = NewCorrection(NewLabel)
export type NewLabelCorrection = v.InferInput<typeof NewLabelCorrection>
