import { describe, expect, it } from "vitest"

import { format, FormatOption, Precision } from "./duration"

describe("formatDuration", () => {
	it("should return undefined for null or undefined input", () => {
		expect(format(null)).toBeUndefined()
		expect(format(undefined)).toBeUndefined()
	})

	it("should format duration of 0 ", () => {
		expect(format(0)).toBe("0:00")
		expect(format(0, { precision: Precision.Min })).toBe("0")
		expect(format(0, { precision: Precision.Sec })).toBe("0:00")
		expect(format(0, { precision: Precision.Milli })).toBe("0:00.000")
	})

	it("should format duration less than 1 second", () => {
		expect(format(500)).toBe("0:00")
		expect(format(500, { precision: Precision.Sec })).toBe("0:00")
		expect(format(500, { precision: Precision.Milli })).toBe("0:00.500")
	})

	it("should support milliseconds precision", () => {
		const opt: FormatOption = { precision: Precision.Milli }
		expect(format(500, opt)).toBe("0:00.500")
		expect(format(1500, opt)).toBe("0:01.500")
		expect(format(3661123, opt)).toBe("1:01:01.123")
	})
})
