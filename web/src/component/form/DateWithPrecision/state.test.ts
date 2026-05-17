import { describe, expect, it } from "vitest"

import type { Store } from "./state"
import { setDay, setMonth, setYear } from "./state"

describe("date with precision state", () => {
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
