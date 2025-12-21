import { describe, it, expect } from "vitest"

import { DateWithPrecision } from "~/domain/shared"

describe("DateWithPrecision.toInput", () => {
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
