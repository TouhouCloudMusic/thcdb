import * as v from "valibot"

import { DatePrecision } from "./schema"

export type In = {
	value: Date
	precision: DatePrecision
}

export type Out = v.InferOutput<typeof Schema>

export const Schema = v.pipe(
	v.object({
		value: v.date(),
		precision: DatePrecision,
	}),
	v.transform((v) => {
		if (v.precision === "Year") {
			v.value.setMonth(0)
			v.value.setDate(1)
		} else if (v.precision === "Month") {
			v.value.setDate(1)
		}

		return {
			value: toPlainDate(v.value),
			precision: v.precision,
		}
	}),
)

export function display(date: Out): string
export function display(date?: Out | null): string | undefined {
	if (!date) return
	const [year, month, day] = date.value.split("-")
	if (date.precision == "Year") {
		return year!
	}
	if (date.precision == "Month") {
		return `${year!}-${month!}`
	}
	return `${year!}-${month!}-${day!}`
}

function toPlainDate(date: Date): string {
	// oxlint-disable-next-line no-non-null-assertion
	return date.toISOString().split("T")[0]!
}
