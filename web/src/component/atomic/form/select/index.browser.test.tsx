import {
	createForm,
	Form,
	getErrors,
	getInput,
	isTouched,
	reset,
	setInput,
	useField,
} from "@formisch/solid"
import type { FormStore } from "@formisch/solid"
import {
	cleanup,
	render,
	renderHook,
	screen,
	waitFor,
} from "@solidjs/testing-library"
import { createSignal } from "solid-js"
import * as v from "valibot"
import { afterEach, describe, expect, it, vi } from "vitest"
import { userEvent } from "vitest/browser"

import { Select } from "./index"

const options = ["Genre", "Scene"] as const
const schema = v.object({
	type: v.picklist(options, "Choose a type"),
})

function TypeSelect(props: { form: FormStore<typeof schema> }) {
	const field = useField(() => props.form, { path: ["type"] })

	return (
		<Select.Root
			value={field.input}
			onChange={field.onInput}
			fieldProps={field.props}
			errors={field.errors}
			options={options}
			placeholder="Choose type"
		>
			<Select.Label>Type</Select.Label>
			<Select.Trigger />
			<Select.Content />
			<Select.ErrorList />
		</Select.Root>
	)
}

async function chooseType(option: string) {
	await userEvent.click(screen.getByRole("button", { name: /Type/u }))
	await userEvent.click(await screen.findByRole("option", { name: option }))
}

describe("select", () => {
	afterEach(cleanup)

	it("visible selections match form values through updates and reset", async () => {
		expect.hasAssertions()
		let form!: FormStore<typeof schema>
		render(() => {
			form = createForm({ schema, initialInput: { type: "Genre" } })
			return <TypeSelect form={form} />
		})
		const trigger = screen.getByRole("button", { name: /Type/u })
		const selection = () => ({
			value: getInput(form).type,
			displayed: trigger.textContent,
		})
		expect(selection()).toStrictEqual({ value: "Genre", displayed: "Genre" })

		await chooseType("Scene")
		expect(selection()).toStrictEqual({ value: "Scene", displayed: "Scene" })
		const { result: field } = renderHook(() =>
			useField(form, { path: ["type"] }),
		)
		field.onInput(undefined)
		expect(selection()).toStrictEqual({
			value: undefined,
			displayed: "Choose type",
		})
		setInput(form, { path: ["type"], input: "Scene" })
		expect(selection()).toStrictEqual({ value: "Scene", displayed: "Scene" })
		reset(form)
		expect(selection()).toStrictEqual({ value: "Genre", displayed: "Genre" })
	})

	it("focus marks the field touched and blur displays validation errors", async () => {
		expect.hasAssertions()
		let form!: FormStore<typeof schema>
		render(() => {
			form = createForm({ schema, validate: "blur" })
			return (
				<>
					<button type="button">Before</button>
					<TypeSelect form={form} />
					<button type="button">After</button>
				</>
			)
		})
		const trigger = screen.getByRole("button", { name: /Type/u })
		await userEvent.click(screen.getByRole("button", { name: "Before" }))
		await userEvent.tab()
		expect(trigger).toHaveFocus()
		expect({
			touched: isTouched(form, { path: ["type"] }),
			errors: getErrors(form, { path: ["type"] }),
		}).toStrictEqual({ touched: true, errors: null })

		await userEvent.tab()
		await waitFor(() =>
			expect(getErrors(form, { path: ["type"] })).toStrictEqual([
				"Choose a type",
			]),
		)
		expect(screen.getByText("Choose a type")).toBeInTheDocument()
		expect(trigger).toHaveAttribute("aria-invalid", "true")
	})

	it("submission focuses the invalid select", async () => {
		expect.hasAssertions()
		let form!: FormStore<typeof schema>
		render(() => {
			form = createForm({ schema })
			return (
				<Form
					of={form}
					onSubmit={() => undefined}
				>
					<TypeSelect form={form} />
					<button type="submit">Save</button>
				</Form>
			)
		})

		await userEvent.click(screen.getByRole("button", { name: "Save" }))
		await waitFor(() =>
			expect(getErrors(form, { path: ["type"] })).toStrictEqual([
				"Choose a type",
			]),
		)
		expect(screen.getByRole("button", { name: /Type/u })).toHaveFocus()
	})

	type NamedOption = { id: number | undefined; label: string }

	it.each([
		{
			name: "a text key",
			optionTextValue: "label" as const,
			renderValue: undefined,
			initialText: "Alpha",
			selectedText: "Zulu",
			allText: "All",
		},
		{
			name: "a text getter and custom selected text",
			optionTextValue: (option: NamedOption) => option.label,
			renderValue: (option: NamedOption) => `#${option.id ?? "all"}`,
			initialText: "#1",
			selectedText: "#2",
			allText: "#all",
		},
	])("object selections remain controlled with $name", async (config) => {
		expect.hasAssertions()
		const alpha = { id: 1, label: "Alpha" }
		const zulu = { id: 2, label: "Zulu" }
		const all = { id: undefined, label: "All" }
		const [selected, setSelected] = createSignal<NamedOption | undefined>(alpha)
		const onChange =
			vi.fn<(value: NamedOption | undefined) => void>(setSelected)
		const selectedText = () => {
			const option = selected()
			if (option && config.renderValue) return config.renderValue(option)
		}
		render(() => (
			<Select.Root
				options={[all, alpha, zulu]}
				value={selected()}
				onChange={onChange}
				optionValue={(option) => option.id ?? "all"}
				optionTextValue={config.optionTextValue}
				placeholder="Choose sort type"
			>
				<Select.Trigger aria-label="Sort type">
					<Select.Value>{selectedText()}</Select.Value>
					<Select.Icon />
				</Select.Trigger>
				<Select.Content />
			</Select.Root>
		))
		const trigger = screen.getByRole("button", { name: /Sort type/u })
		await userEvent.click(trigger)
		const option = await screen.findByRole("option", { name: "Zulu" })
		expect(option).toBeVisible()
		await userEvent.keyboard("z{Enter}")
		expect({
			selected: onChange.mock.calls,
			displayed: trigger.textContent,
		}).toStrictEqual({
			selected: [[zulu]],
			displayed: config.selectedText,
		})

		setSelected(alpha)
		expect({
			selected: onChange.mock.calls,
			displayed: trigger.textContent,
		}).toStrictEqual({
			selected: [[zulu]],
			displayed: config.initialText,
		})

		await userEvent.click(trigger)
		await userEvent.click(await screen.findByRole("option", { name: "All" }))
		expect({
			selected: onChange.mock.calls,
			displayed: trigger.textContent,
		}).toStrictEqual({
			selected: [[zulu], [all]],
			displayed: config.allText,
		})
	})
})
