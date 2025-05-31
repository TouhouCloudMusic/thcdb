import * as v from "valibot"

import type { OpenApiSchema } from "~/api"
import type { ExternalSchema } from "~/types/valibot"
import type { DeepMerge } from "~/utils/object"

import { DatePrecision } from "../schema"

export type In = DeepMerge<
	[
		{
			value: Date
		},
		OpenApiSchema["DateWithPrecision"],
	]
>
export type Out = v.InferOutput<typeof Schema>

export const Schema = v.pipe(
	v.object({
		value: v.date(),
		precision: DatePrecision,
	} satisfies ExternalSchema<In>),
	v.transform((v) => {
		if (v.precision === "Year") {
			v.value.setMonth(0)
			v.value.setDate(1)
		} else if (v.precision === "Month") {
			v.value.setDate(1)
		}

		// @ts-expect-error
		v.value = toPlainDate(v.value)
		return v as unknown as {
			value: string
			precision: DatePrecision
		}
	}),
)

export function display(date: Out): string
export function display(date?: Out | null): string | undefined
export function display(date?: Out | null): string | undefined {
	if (!date) return
	const [year, month, day] = date.value.split("-")
	if (date.precision == "Year") {
		return year!
	} else if (date.precision == "Month") {
		return `${year!}-${month!}`
	} else {
		return `${year!}-${month!}-${day!}`
	}
}

function toPlainDate(date: Date): string {
	// oxlint-disable-next-line no-non-null-assertion
	return date.toISOString().split("T")[0]!
}
