import * as v from "valibot"

import { ENTITY_IDENT_MAX_LEN, ENTITY_IDENT_MIN_LEN } from "~/constant/server"

const i32_MAX = 2_147_483_647

export const EntityId = v.pipe(
	v.number(),
	v.integer(),
	v.minValue(1),
	v.maxValue(i32_MAX),
)
export const EntityIdent = v.pipe(
	v.string(),
	v.minLength(ENTITY_IDENT_MIN_LEN),
	v.maxLength(ENTITY_IDENT_MAX_LEN),
)

const locationField = v.nullish(v.pipe(v.string(), v.nonEmpty()))
export const Location = v.object({
	country: locationField,
	province: locationField,
	city: locationField,
})
export type Location = v.InferInput<typeof Location>

export const DatePrecision = v.union(
	(["Day", "Month", "Year"] as const).map((x) => v.literal(x)),
)
export type DatePrecision = v.InferInput<typeof DatePrecision>

export const NewLocalizedName = v.object({
	language_id: v.message(EntityId, "Language not selected"),
	name: v.message(EntityIdent, "Name is required and must be non-empty"),
})

export const Year = v.pipe(v.number(), v.integer())

export const CorrectionType = v.union([
	v.literal("Create"),
	v.literal("Update"),
	v.literal("Delete"),
])

export type CorrectionType = v.InferInput<typeof CorrectionType>

export function NewCorrection<T extends v.ObjectEntries>(
	// oxlint-disable-next-line @typescript-eslint/no-explicit-any
	schema: v.ObjectSchema<T, any>,
) {
	return v.object({
		data: schema,
		description: v.string(),
		type: CorrectionType,
	})
}

export type NewCorrection<T> = {
	data: T
	description: string
	type: CorrectionType
}
