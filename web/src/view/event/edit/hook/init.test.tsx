import { createForm, getInput } from "@formisch/solid"
import { describe, expect, it } from "vitest"

import { NewEventCorrection } from "~/domain/event"
import { createMockEvent } from "~/mock/event"
import { createMockNamedReference } from "~/mock/reference"

import { toEventFormInitValue } from "./init"

describe("event form initialization", () => {
	it("maps event fields for edit form", () => {
		const firstName = createMockNamedReference(11)
		const secondName = createMockNamedReference(12)
		const event = createMockEvent(1, {
			short_description: "Touhou convention",
			description: "Annual Touhou convention",
			start_date: { value: "2023-05-01", precision: "Day" },
			end_date: { value: "2023-05-03", precision: "Day" },
			alternative_names: [firstName, secondName],
			location: {
				country: "Japan",
				province: null,
				city: "Tokyo",
			},
			links: ["https://example.com/events/1"],
		})

		const form = createForm({
			schema: NewEventCorrection,
			initialInput: toEventFormInitValue({ type: "edit", event }),
		})
		const result = getInput(form)

		expect({
			type: result.type,
			description: result.description,
			name: result.data.name,
			shortDescription: result.data.short_description,
			descriptionInput: result.data.description,
			alternativeNames: result.data.alternative_names,
			location: result.data.location,
			startDate: result.data.start_date,
			endDate: result.data.end_date,
			links: result.data.links,
		}).toStrictEqual({
			type: "Update",
			description: "",
			name: event.name,
			shortDescription: event.short_description,
			descriptionInput: event.description,
			alternativeNames: [firstName.name, secondName.name],
			location: {
				country: "Japan",
				province: null,
				city: "Tokyo",
			},
			startDate: {
				value: new Date("2023-05-01T00:00:00Z"),
				precision: "Day",
			},
			endDate: {
				value: new Date("2023-05-03T00:00:00Z"),
				precision: "Day",
			},
			links: ["https://example.com/events/1"],
		})
	})
})
