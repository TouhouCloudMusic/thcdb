import { cleanup, render } from "@solidjs/testing-library"
import { createSignal } from "solid-js"
import { afterEach, describe, expect, it, vi } from "vitest"
import { userEvent } from "vitest/browser"

import { I18NProvider } from "~/state/i18n"

import { DateWithPrecision } from "."
import type { DateWithPrecisionProps } from "."

const initialStates = [
	{ name: "empty", value: undefined, displayed: ["", "", ""] },
	{
		name: "Year",
		value: { value: new Date("2024-01-01T00:00:00Z"), precision: "Year" },
		displayed: ["2024", "", ""],
	},
	{
		name: "Month",
		value: { value: new Date("2024-02-01T00:00:00Z"), precision: "Month" },
		displayed: ["2024", "2", ""],
	},
	{
		name: "Day",
		value: { value: new Date("2024-02-29T00:00:00Z"), precision: "Day" },
		displayed: ["2024", "2", "29"],
	},
] as const

const updatedStates = [
	{ name: "empty", value: undefined, displayed: ["", "", ""] },
	{
		name: "Year",
		value: { value: new Date("2025-01-01T00:00:00Z"), precision: "Year" },
		displayed: ["2025", "", ""],
	},
	{
		name: "Month",
		value: { value: new Date("2025-04-01T00:00:00Z"), precision: "Month" },
		displayed: ["2025", "4", ""],
	},
	{
		name: "Day",
		value: { value: new Date("2025-04-30T00:00:00Z"), precision: "Day" },
		displayed: ["2025", "4", "30"],
	},
] as const

const partialStates = [
	{ name: "missing date and precision", value: {}, displayed: ["", "", ""] },
	{
		name: "missing date",
		value: { precision: "Day" },
		displayed: ["", "", ""],
	},
	{
		name: "missing precision",
		value: { value: new Date("2025-04-30T00:00:00Z") },
		displayed: ["", "", ""],
	},
] as const

function renderDate(initialValue?: DateWithPrecisionProps["value"]) {
	const [value, setValue] = createSignal(initialValue)
	const onChange = vi.fn<DateWithPrecisionProps["setValue"]>(setValue)
	const view = render(() => (
		<I18NProvider initialLocale="en">
			<DateWithPrecision
				value={value()}
				setValue={onChange}
			/>
		</I18NProvider>
	))

	return { ...view, setValue, onChange }
}

describe("date with precision", () => {
	afterEach(cleanup)

	const transitions = [
		...initialStates.flatMap((from) =>
			updatedStates.map((to) => ({ from, to })),
		),
		...partialStates.map((to) => ({ from: initialStates[3], to })),
	]

	it.each(transitions)(
		"setting the external value from $from.name to $to.name updates the display without emitting a change",
		({ from, to }) => {
			const { container, setValue, onChange } = renderDate(from.value)
			const inputs = container.querySelectorAll("input")
			expect(Array.from(inputs, (input) => input.value)).toStrictEqual(
				from.displayed,
			)

			setValue(to.value)

			expect(Array.from(inputs, (input) => input.value)).toStrictEqual(
				to.displayed,
			)
			expect(onChange).not.toHaveBeenCalled()
		},
	)

	it("editing", async () => {
		expect.hasAssertions()
		const view = renderDate()

		await userEvent.fill(view.getByPlaceholderText("Year"), "2024")
		await userEvent.fill(view.getByPlaceholderText("Month"), "2")
		await userEvent.fill(view.getByPlaceholderText("Day"), "29")
		await userEvent.fill(view.getByPlaceholderText("Day"), "")
		await userEvent.fill(view.getByPlaceholderText("Month"), "")
		await userEvent.fill(view.getByPlaceholderText("Year"), "")

		expect(view.onChange.mock.calls).toStrictEqual([
			[{ value: new Date("2024-01-01T00:00:00Z"), precision: "Year" }],
			[{ value: new Date("2024-02-01T00:00:00Z"), precision: "Month" }],
			[{ value: new Date("2024-02-29T00:00:00Z"), precision: "Day" }],
			[{ value: new Date("2024-02-01T00:00:00Z"), precision: "Month" }],
			[{ value: new Date("2024-01-01T00:00:00Z"), precision: "Year" }],
			[undefined],
		])
	})
})
