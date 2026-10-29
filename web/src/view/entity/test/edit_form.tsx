import { cleanup, render, waitFor } from "@solidjs/testing-library"
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterContextProvider,
} from "@tanstack/solid-router"
import { http, HttpResponse } from "msw/http"
import type { JSX } from "solid-js"
import { afterEach, beforeEach, expect } from "vitest"

import type { Language } from "~/hey-api"
import { languageListOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { I18NProvider } from "~/state/i18n"
import { loadLocale } from "~/state/i18n/runtime"
import { worker } from "~/test/browser"

const queryClients: QueryClient[] = []

beforeEach(async () => {
	await loadLocale("en")
})

afterEach(() => {
	cleanup()
	for (const queryClient of queryClients) queryClient.clear()
	queryClients.length = 0
})

export async function renderEditor(
	editor: () => JSX.Element,
	languages?: Language[],
) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	})
	queryClients.push(queryClient)
	if (languages) {
		worker.use(
			http.get("*/api/languages", () =>
				HttpResponse.json({ status: "Ok", data: languages }),
			),
		)
		await queryClient.ensureQueryData(languageListOptions())
	}
	const router = createRouter({
		routeTree: createRootRoute(),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	})

	const result = render(() => (
		<RouterContextProvider router={router}>
			{() => (
				<QueryClientProvider client={queryClient}>
					<I18NProvider initialLocale="en">{editor()}</I18NProvider>
				</QueryClientProvider>
			)}
		</RouterContextProvider>
	))

	await waitFor(() =>
		expect(result.container.querySelector("form")).not.toBeNull(),
	)

	return result
}
