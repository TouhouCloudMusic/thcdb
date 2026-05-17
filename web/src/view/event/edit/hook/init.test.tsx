import { describe, expect, it } from "vitest"

import { toEventFormInitValue } from "./init"
import type { EventWithLocation } from "./init"

describe("event form initialization", () => {
	it("returns default values for new form", () => {
		const result = toEventFormInitValue({ type: "new" })

		expect(result).toStrictEqual({
			type: "Create",
			description: "",
			data: {
				name: "",
				short_description: undefined,
				description: undefined,
				start_date: undefined,
				end_date: undefined,
				alternative_names: [],
				location: undefined,
			},
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

		expect({
			type: result.type,
			description: result.description,
			name: result.data.name,
			shortDescription: result.data.short_description,
			descriptionInput: result.data.description,
			alternativeNames: result.data.alternative_names,
			location: result.data.location,
			startDatePrecision: result.data.start_date?.precision,
			startDateYear: result.data.start_date?.value.getUTCFullYear(),
			startDateMonth: result.data.start_date?.value.getUTCMonth(),
			startDateDay: result.data.start_date?.value.getUTCDate(),
			endDatePrecision: result.data.end_date?.precision,
			endDateDay: result.data.end_date?.value.getUTCDate(),
		}).toStrictEqual({
			type: "Update",
			description: "",
			name: event.name,
			shortDescription: event.short_description,
			descriptionInput: event.description,
			alternativeNames: ["例大祭", "博麗神社例大祭"],
			location: {
				country: "Japan",
				province: null,
				city: "Tokyo",
			},
			startDatePrecision: "Day",
			startDateYear: 2023,
			startDateMonth: 4,
			startDateDay: 1,
			endDatePrecision: "Day",
			endDateDay: 3,
		})
	})
})
