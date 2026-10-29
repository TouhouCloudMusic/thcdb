import { cleanup, render, screen, waitFor } from "@solidjs/testing-library"
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import { createSignal } from "solid-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { userEvent } from "vitest/browser"

import type { Language } from "~/hey-api"
import { I18NProvider } from "~/state/i18n"
import { loadLocale } from "~/state/i18n/runtime"
import { languageListQueryOptions } from "~/state/language"

import { LanguageSelect } from "./LanguageSelect"

const japanese = { id: 1, code: "ja", name: "Japanese" }
const english = { id: 2, code: "en", name: "English" }
const chinese = { id: 3, code: "zh", name: "Chinese" }
const clients: QueryClient[] = []

function createClient(languages: Language[]) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	})
	client.setQueryData(languageListQueryOptions().queryKey, {
		status: "Ok",
		data: languages,
	})
	clients.push(client)
	return client
}

function renderSelection(initial: Language) {
	const [value, setValue] = createSignal<Language | undefined>(initial)
	const client = createClient([japanese, english, chinese])
	const onChange = vi.fn<(language: Language | undefined) => void>(setValue)

	render(() => (
		<QueryClientProvider client={client}>
			<I18NProvider initialLocale="en">
				<LanguageSelect
					value={value()}
					onChange={onChange}
					filter={(language) => language.id === chinese.id}
				/>
			</I18NProvider>
		</QueryClientProvider>
	))

	return { input: screen.getByRole("combobox"), onChange }
}

describe("language selection", () => {
	beforeEach(async () => loadLocale("en"))
	afterEach(() => {
		cleanup()
		for (const client of clients) client.clear()
		clients.length = 0
	})

	it("the supplied value determines the selected language", async () => {
		expect.hasAssertions()
		const [value, setValue] = createSignal<Language | undefined>(english)
		const client = createClient([japanese, english])
		const setCatalog = (languages: Language[]) =>
			client.setQueryData(languageListQueryOptions().queryKey, {
				status: "Ok",
				data: languages,
			})
		const onChange = vi.fn<(language: Language | undefined) => void>()

		render(() => (
			<QueryClientProvider client={client}>
				<I18NProvider initialLocale="en">
					<LanguageSelect
						value={value()}
						onChange={onChange}
						filter={(language) => language.id !== english.id}
					/>
				</I18NProvider>
			</QueryClientProvider>
		))
		const input = screen.getByRole("combobox")
		expect(input).toHaveValue(english.name)

		setValue(japanese)
		await waitFor(() => expect(input).toHaveValue(japanese.name))
		setValue(english)
		await waitFor(() => expect(input).toHaveValue(english.name))
		setCatalog([japanese, { ...english, name: "Updated catalog name" }])
		await waitFor(() => expect(input).toHaveValue(english.name))

		await userEvent.click(screen.getByRole("button"))
		await expect(
			screen.findByRole("option", { name: english.name }),
		).resolves.toBeVisible()
		expect(
			screen.queryByRole("option", { name: "Updated catalog name" }),
		).not.toBeInTheDocument()
		setCatalog([japanese])
		await expect(
			screen.findByRole("option", { name: english.name }),
		).resolves.toBeVisible()

		await userEvent.keyboard("{Escape}")
		await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "false"))
		setValue(undefined)
		await waitFor(() => expect(input).toHaveValue(""))
		expect(onChange).not.toHaveBeenCalled()
	})

	it("search text does not change the selected language", async () => {
		expect.hasAssertions()
		const { input, onChange } = renderSelection(japanese)

		await userEvent.fill(input, chinese.name)
		expect(onChange).not.toHaveBeenCalled()
		await userEvent.click(
			await screen.findByRole("option", { name: chinese.name }),
		)
		await waitFor(() => expect(onChange.mock.calls).toStrictEqual([[chinese]]))
	})

	it.each([
		{ text: "", action: "Escape", description: "clearing and pressing Escape" },
		{
			text: "No matching language",
			action: "Escape",
			description: "pressing Escape",
		},
		{ text: "Ch", action: "blur", description: "leaving the input" },
		{ text: "Ch", action: "trigger", description: "closing the list" },
	] as const)(
		"$description restores the selected language",
		async ({ text, action }) => {
			expect.hasAssertions()
			const { input, onChange } = renderSelection(chinese)

			await userEvent.clear(input)
			if (text) await userEvent.type(input, text)
			if (action === "Escape") await userEvent.keyboard("{Escape}")
			else if (action === "blur") await userEvent.tab()
			else await userEvent.click(screen.getByRole("button"))

			await waitFor(() => expect(input).toHaveValue(chinese.name))
			expect(onChange).not.toHaveBeenCalled()
		},
	)

	it("confirming an empty search clears the selection without submitting", async () => {
		expect.hasAssertions()
		const [value, setValue] = createSignal<Language | undefined>(chinese)
		const client = createClient([chinese])
		const onChange = vi.fn<(language: Language | undefined) => void>(setValue)
		const onSubmit = vi.fn<(event: SubmitEvent) => void>((event) =>
			event.preventDefault(),
		)
		render(() => (
			<QueryClientProvider client={client}>
				<I18NProvider initialLocale="en">
					<form onSubmit={onSubmit}>
						<LanguageSelect
							value={value()}
							onChange={onChange}
						/>
					</form>
				</I18NProvider>
			</QueryClientProvider>
		))
		const input = screen.getByRole("combobox")

		await userEvent.clear(input)
		await userEvent.keyboard("{ArrowDown}{Enter}")
		await waitFor(() => expect(input).toHaveValue(""))
		expect(onChange.mock.calls).toStrictEqual([[undefined]])
		expect(onSubmit).not.toHaveBeenCalled()
	})

	it.each(["click", "keyboard"] as const)(
		"confirming the selected language with %s clears the selection",
		async (method) => {
			expect.hasAssertions()
			const { input, onChange } = renderSelection(chinese)

			await userEvent.fill(input, "Ch")
			if (method === "click") {
				await userEvent.click(
					await screen.findByRole("option", { name: chinese.name }),
				)
			} else {
				await userEvent.keyboard("{ArrowDown}{Enter}")
			}
			await waitFor(() => expect(input).toHaveValue(""))
			expect(onChange.mock.calls).toStrictEqual([[undefined]])
		},
	)
})
