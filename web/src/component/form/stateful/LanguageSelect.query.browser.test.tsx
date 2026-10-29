import { cleanup, render, screen, waitFor } from "@solidjs/testing-library"
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import { http, HttpResponse } from "msw/http"
import { Suspense } from "solid-js"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { userEvent } from "vitest/browser"

import { I18NProvider } from "~/state/i18n"
import { loadLocale } from "~/state/i18n/runtime"
import { languageListQueryOptions } from "~/state/language"
import { worker } from "~/test/browser"

import { LanguageSelect } from "./LanguageSelect"

const japanese = { id: 1, code: "ja", name: "Japanese" }
const english = { id: 2, code: "en", name: "English" }
const clients: QueryClient[] = []

function createClient() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	})
	clients.push(client)
	return client
}

describe("language selection query", () => {
	beforeEach(async () => loadLocale("en"))
	afterEach(() => {
		cleanup()
		for (const client of clients) client.clear()
		clients.length = 0
	})

	it("catalog loading preserves the editor and its language selection", async () => {
		expect.hasAssertions()
		const response = Promise.withResolvers<undefined>()
		const requested = Promise.withResolvers<undefined>()
		worker.use(
			http.get("*/api/languages", async () => {
				requested.resolve(undefined)
				await response.promise
				return HttpResponse.json({ status: "Ok", data: [japanese] })
			}),
		)
		const client = createClient()
		render(() => (
			<QueryClientProvider client={client}>
				<I18NProvider initialLocale="en">
					<Suspense fallback={<div>Editor loading...</div>}>
						<form>
							<input aria-label="Title" />
							<LanguageSelect
								value={japanese}
								onChange={() => undefined}
							/>
						</form>
					</Suspense>
				</I18NProvider>
			</QueryClientProvider>
		))

		try {
			await requested.promise
			const language = screen.getByRole<HTMLInputElement>("combobox")
			expect(language).toHaveValue("Japanese")
			expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
			await userEvent.click(screen.getByRole("button"))
			expect({
				message: screen.getByRole("status").textContent,
				busy: screen.getByRole("listbox").getAttribute("aria-busy"),
			}).toStrictEqual({ message: "Loading...", busy: "true" })
			const title = screen.getByRole<HTMLInputElement>("textbox", {
				name: "Title",
			})
			await userEvent.fill(title, "Unsaved title")
			response.resolve(undefined)
			await userEvent.click(screen.getByRole("button"))
			await waitFor(() =>
				expect(screen.getByRole("listbox")).toHaveAttribute(
					"aria-busy",
					"false",
				),
			)
			expect({
				sameControl: screen.getByRole("combobox") === language,
				language: language.value,
				title: title.value,
			}).toStrictEqual({
				sameControl: true,
				language: "Japanese",
				title: "Unsaved title",
			})
		} finally {
			response.resolve(undefined)
		}
	})

	it("prefetched languages are reused without another request", async () => {
		expect.hasAssertions()
		let requests = 0
		worker.use(
			http.get("*/api/languages", () => {
				requests += 1
				return HttpResponse.json({
					status: "Ok",
					data: [japanese, english],
				})
			}),
		)

		const client = createClient()
		await client.prefetchQuery(languageListQueryOptions())
		expect(requests).toBe(1)

		render(() => (
			<QueryClientProvider client={client}>
				<I18NProvider initialLocale="en">
					<LanguageSelect
						value={japanese}
						onChange={() => undefined}
					/>
				</I18NProvider>
			</QueryClientProvider>
		))
		await screen.findByRole("combobox")
		await userEvent.click(screen.getByRole("button"))
		await expect(
			screen.findByRole("option", { name: english.name }),
		).resolves.toBeVisible()
		expect(requests).toBe(1)
	})
})
