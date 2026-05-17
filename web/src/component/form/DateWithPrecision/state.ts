import { DateExt } from "@thc/toolkit/data"
import * as v from "valibot"

import type {
	DatePrecision,
	DateWithPrecision as TDateWithPrecision,
} from "~/domain/shared"

const THIS_YEAR = new Date().getFullYear()

function createNumericInputSchema(maxDigits: number) {
	return v.pipe(
		v.string(),
		v.regex(/^\d*$/u),
		v.transform((value) => value.slice(0, maxDigits)),
		v.transform((value) =>
			value === "" ? undefined : Number.parseInt(value, 10),
		),
	)
}

const YEAR_INPUT_SCHEMA = createNumericInputSchema(4)
const DATE_PART_INPUT_SCHEMA = createNumericInputSchema(2)

function parseNumber(
	schema: v.GenericSchema<string, number | undefined>,
	raw: string,
): number | undefined {
	const result = v.safeParse(schema, raw)
	return result.success ? result.output : undefined
}

function daysInMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export type Store = {
	year?: number
	month?: number
	day?: number
}

function Store_normalize(store: Store): Store {
	if (store.year === undefined) return {}

	const month =
		store.month === undefined || store.month < 1
			? undefined
			: Math.min(store.month, 12)
	const day =
		month === undefined || store.day === undefined || store.day < 1
			? undefined
			: Math.min(store.day, daysInMonth(store.year, month))

	return { year: store.year, month, day }
}

function Store_getPrecision(store: Store): DatePrecision | undefined {
	if (store.year === undefined) return
	if (store.month === undefined) return "Year"
	if (store.day === undefined) return "Month"
	return "Day"
}

export function setYear(store: Store, raw: string): Store {
	let year = parseNumber(YEAR_INPUT_SCHEMA, raw)
	if (year !== undefined) {
		year = Math.min(year, THIS_YEAR)
	}

	return Store_normalize({
		year,
		month: store.month,
		day: store.day,
	})
}

export function setMonth(store: Store, raw: string): Store {
	return Store_normalize({
		year: store.year,
		month: parseNumber(DATE_PART_INPUT_SCHEMA, raw),
		day: store.day,
	})
}

export function setDay(store: Store, raw: string): Store {
	return Store_normalize({
		year: store.year,
		month: store.month,
		day: parseNumber(DATE_PART_INPUT_SCHEMA, raw),
	})
}

export function valueToStore(value?: TDateWithPrecision.In): Store {
	if (!value) return {}

	const year = value.value.getUTCFullYear()
	const month =
		value.precision === "Year" ? undefined : value.value.getUTCMonth() + 1
	const day = value.precision === "Day" ? value.value.getUTCDate() : undefined

	return Store_normalize({ year, month, day })
}

export function storeToValue(store: Store): TDateWithPrecision.In | undefined {
	const precision = Store_getPrecision(store)
	if (!precision) return

	return {
		value: DateExt.fromYMD(store.year!, store.month ?? 1, store.day ?? 1),
		precision,
	}
}
