import * as fc from "fast-check"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Store } from "./state"
import { setDay, setMonth, setYear, storeToValue, valueToStore } from "./state"

const plainDates = fc
	.date({
		min: new Date("0001-01-01T00:00:00.000Z"),
		max: new Date("9999-12-31T00:00:00.000Z"),
		noInvalidDate: true,
	})
	.map((date) => date.toISOString().slice(0, 10))

const datesWithPrecision = fc.oneof(
	plainDates.map((date) => ({
		value: `${date.slice(0, 4)}-01-01`,
		precision: "Year" as const,
	})),
	plainDates.map((date) => ({
		value: `${date.slice(0, 7)}-01`,
		precision: "Month" as const,
	})),
	plainDates.map((date) => ({ value: date, precision: "Day" as const })),
)

describe("date with precision state", () => {
	afterEach(() => vi.unstubAllEnvs())

	it("roundtrips are independent of timezone", () => {
		expect.hasAssertions()

		fc.assert(
			fc.property(datesWithPrecision, (date) => {
				const value = {
					value: new Date(date.value),
					precision: date.precision,
				}
				const [year, month, day] = date.value.split("-").map(Number)
				const expectedStore = {
					year,
					month: date.precision === "Year" ? undefined : month,
					day: date.precision === "Day" ? day : undefined,
				}

				for (const timezone of ["Asia/Hong_Kong", "America/New_York"]) {
					vi.stubEnv("TZ", timezone)

					const store = valueToStore(value)
					expect(store).toStrictEqual(expectedStore)
					expect(storeToValue(store)).toStrictEqual(value)
				}
			}),
			{
				examples: [
					[{ value: "0001-01-01", precision: "Year" }],
					[{ value: "0004-02-29", precision: "Day" }],
					[{ value: "1900-02-01", precision: "Month" }],
					[{ value: "2000-02-29", precision: "Day" }],
					[{ value: "9999-12-31", precision: "Day" }],
				],
			},
		)
	})

	it("limits year input to 4 digits", () => {
		let s: Store = {}
		s = setYear(s, "123456")
		expect(s.year).toBe(1234)
	})

	it("does not change month when day already has 2 digits and more digits are typed", () => {
		let s: Store = {}
		s = setYear(s, "2024")
		s = setMonth(s, "12")
		s = setDay(s, "12")

		s = setDay(s, "123")
		expect(s.month).toBe(12)
		expect(s.day).toBe(12)
	})

	it("clamps day to the maximum day of the given month", () => {
		let s: Store = {}
		s = setYear(s, "2023")
		s = setMonth(s, "04")
		s = setDay(s, "31")
		expect(s.month).toBe(4)
		expect(s.day).toBe(30)
	})
})
