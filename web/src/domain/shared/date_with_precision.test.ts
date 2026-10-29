import * as v from "valibot"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DateWithPrecision } from "~/domain/shared"

describe("date with precision to input", () => {
	it("returns undefined for nil", () => {
		expect(DateWithPrecision.toInput(undefined)).toBeUndefined()
	})

	it("converts Day precision", () => {
		const out = { value: "2020-01-02", precision: "Day" as const }
		const input = DateWithPrecision.toInput(out)!
		expect(input.value).toBeInstanceOf(Date)
		expect(input.precision).toBe("Day")
		expect(input.value.toISOString().startsWith("2020-01-02")).toBe(true)
	})

	it("converts Month precision", () => {
		const out = { value: "2019-05-01", precision: "Month" as const }
		const input = DateWithPrecision.toInput(out)!
		expect(input.value).toBeInstanceOf(Date)
		expect(input.precision).toBe("Month")
		expect(input.value.getUTCFullYear()).toBe(2019)
		expect(input.value.getUTCMonth()).toBe(4)
		expect(input.value.getUTCDate()).toBe(1)
	})

	it("converts Year precision", () => {
		const out = { value: "2018-01-01", precision: "Year" as const }
		const input = DateWithPrecision.toInput(out)!
		expect(input.value).toBeInstanceOf(Date)
		expect(input.precision).toBe("Year")
		expect(input.value.getUTCFullYear()).toBe(2018)
		expect(input.value.getUTCMonth()).toBe(0)
		expect(input.value.getUTCDate()).toBe(1)
	})
})

describe("date submission", () => {
	afterEach(() => vi.unstubAllEnvs())

	it.each([
		{
			precision: "Year",
			expected: { value: "2024-01-01", precision: "Year" },
		},
		{
			precision: "Month",
			expected: { value: "2024-02-01", precision: "Month" },
		},
		{
			precision: "Day",
			expected: { value: "2024-02-29", precision: "Day" },
		},
	] as const)(
		"$precision normalization is timezone independent",
		({ precision, expected }) => {
			expect.hasAssertions()

			const input = {
				value: new Date("2024-02-29T00:00:00Z"),
				precision,
			}

			for (const timezone of ["UTC", "America/New_York"]) {
				vi.stubEnv("TZ", timezone)

				expect(v.parse(DateWithPrecision.Schema, input)).toStrictEqual(expected)
				expect(input).toStrictEqual({
					value: new Date("2024-02-29T00:00:00Z"),
					precision,
				})
			}
		},
	)
})
