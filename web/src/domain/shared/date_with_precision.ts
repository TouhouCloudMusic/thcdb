import * as v from "valibot"

import type { nil } from "~/type"

import { DatePrecision } from "./schema"

export const InputSchema = v.object({
	value: v.date(),
	precision: DatePrecision,
})

export type In = v.InferInput<typeof InputSchema>

export type Out = v.InferOutput<typeof Schema>

export const Schema = v.pipe(
	InputSchema,
	v.transform(({ value, precision }) => {
		const date = new Date(value)
		if (precision === "Year") {
			date.setUTCMonth(0, 1)
		} else if (precision === "Month") {
			date.setUTCDate(1)
		}

		return {
			value: toPlainDate(date),
			precision,
		}
	}),
)

export function display(date: Out): string
export function display(date: nil): undefined
export function display(date: Out | nil): string | undefined
export function display(date: Out | nil): string | undefined {
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

export const toInput = (date: Out | nil): In | undefined => {
	if (!date) return undefined
	return { value: new Date(date.value), precision: date.precision }
}

const toPlainDate = (date: Date): string => {
	return date.toISOString().split("T")[0]!
}
