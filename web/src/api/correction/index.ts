import * as v from "valibot"
import type { Eq, Expand, If, Extend, SafeOmit } from "~/types"

import type { OpenApiSchema } from ".."

type O_CorrectionType = OpenApiSchema["CorrectionType"]
export const CorrectionType = v.union([
	v.literal("Create"),
	v.literal("Update"),
	v.literal("Delete"),
])

type V_CorrectionType = v.InferInput<typeof CorrectionType>

export type CorrectionType = If<
	Eq<V_CorrectionType, O_CorrectionType>,
	O_CorrectionType,
	never
>

type O_NewCorrectionBase = Expand<
	SafeOmit<OpenApiSchema["NewCorrection_NewArtist"], "data">
>
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
type V_NewCorrection = SafeOmit<
	v.InferInput<ReturnType<typeof NewCorrection>>,
	"data"
>

export type NewCorrection<T> = If<
	Extend<O_NewCorrectionBase, V_NewCorrection>,
	Expand<
		V_NewCorrection & {
			data: T
		}
	>,
	never
>
