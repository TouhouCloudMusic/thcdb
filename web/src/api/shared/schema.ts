import * as v from "valibot"

import { ENTITY_IDENT_MAX_LEN, ENTITY_IDENT_MIN_LEN } from "~/constant/server"
import type { Eq, If } from "~/types"
import type { ExternalSchema } from "~/types/valibot"

import type { OpenApiSchema } from ".."

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

export type Location = OpenApiSchema["Location"]

const locationField = v.nullish(v.pipe(v.string(), v.nonEmpty()))
export const Location = v.object({
	country: locationField,
	province: locationField,
	city: locationField,
} satisfies ExternalSchema<Location>)

type _DatePrecision = OpenApiSchema["DatePrecision"]

export const DatePrecision = v.union(
	(["Day", "Month", "Year"] as const).map((x) => v.literal(x)),
)
export type DatePrecision = If<
	Eq<_DatePrecision, v.InferInput<typeof DatePrecision>>,
	_DatePrecision,
	never
>

type NewLocalizedName = OpenApiSchema["NewLocalizedName"]
export const NewLocalizedName = v.object({
	language_id: EntityId,
	name: EntityIdent,
} satisfies ExternalSchema<NewLocalizedName>)

export const Year = v.pipe(v.number(), v.integer())
