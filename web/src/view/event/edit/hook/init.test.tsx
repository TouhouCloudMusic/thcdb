import { describe, expect, it } from "vitest"

import { toEventFormInitValue } from "./init"
import type { EventWithLocation } from "./init"

describe("toEventFormInitValue", () => {
	it("returns default values for new form", () => {
		const result = toEventFormInitValue({ type: "new" })

		expect(result.type).toBe("Create")
		expect(result.description).toBe("")
		expect(result.data.name).toBe("")
		expect(result.data.short_description).toBeUndefined()
		expect(result.data.description).toBeUndefined()
		expect(result.data.start_date).toBeUndefined()
		expect(result.data.end_date).toBeUndefined()
		expect(result.data.alternative_names).toEqual([])
		expect(result.data.location).toEqual({
			country: undefined,
			province: undefined,
			city: undefined,
		})
	})

	it("maps event fields for edit form", () => {
		const event: EventWithLocation = {
			id: 1,
			name: "Reitaisai",
			short_description: "Touhou convention",
			description: "Annual Touhou convention",
			start_date: { value: "2023-05-01", precision: "Day" },
			end_date: { value: "2023-05-03", precision: "Day" },
			alternative_names: [
				{ id: 11, name: "例大祭" },
				{ id: 12, name: "博麗神社例大祭" },
			],
			location: {
				country: "Japan",
				province: null,
				city: "Tokyo",
			},
		}

		const result = toEventFormInitValue({ type: "edit", event })

		expect(result.type).toBe("Update")
		expect(result.description).toBe("")
		expect(result.data.name).toBe(event.name)
		expect(result.data.short_description).toBe(event.short_description)
		expect(result.data.description).toBe(event.description)
		expect(result.data.alternative_names).toEqual(["例大祭", "博麗神社例大祭"])
		expect(result.data.location).toEqual({
			country: "Japan",
			province: undefined,
			city: "Tokyo",
		})
		expect(result.data.start_date?.precision).toBe("Day")
		expect(result.data.start_date?.value.getUTCFullYear()).toBe(2023)
		expect(result.data.start_date?.value.getUTCMonth()).toBe(4)
		expect(result.data.start_date?.value.getUTCDate()).toBe(1)
		expect(result.data.end_date?.precision).toBe("Day")
		expect(result.data.end_date?.value.getUTCDate()).toBe(3)
	})
})
