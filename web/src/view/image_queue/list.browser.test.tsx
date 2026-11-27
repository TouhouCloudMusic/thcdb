import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@solidjs/testing-library"
import { createSignal } from "solid-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { I18NProvider } from "~/state/i18n"
import { loadLocale } from "~/state/i18n/runtime"
import { ready } from "~/type/asyncData"
import type { InfiniteQueryState } from "~/utils/adapter/tanstack/infiniteQueryState"

import { ImageQueueList } from "./list"

const EMPTY_MESSAGE = "No entries"

function renderList(initial: InfiniteQueryState<number>) {
	const [state, setState] = createSignal(initial)
	const { container } = render(() => (
		<I18NProvider initialLocale="en">
			<ImageQueueList
				as="ul"
				styles={[]}
				state={state()}
				emptyMessage={EMPTY_MESSAGE}
				errorMessage="Failed to load entries."
			>
				{(id) => <li>Entry {id}</li>}
			</ImageQueueList>
		</I18NProvider>
	))

	return { container, setState }
}

describe("image queue list", () => {
	beforeEach(async () => {
		await loadLocale("en")
	})
	afterEach(cleanup)

	it("announces an initial load without exposing placeholder rows", () => {
		expect.hasAssertions()
		const { container } = renderList({ kind: "loading" })
		expect(container.firstElementChild).toHaveAttribute("aria-busy", "true")
		expect(screen.queryByRole("list")).not.toBeInTheDocument()
	})

	it("continues pagination when the first page has no rows", async () => {
		expect.hasAssertions()
		const { container, setState } = renderList({ kind: "loading" })
		const load = vi.fn<() => void>(() => {
			setState(ready({ items: [], pagination: { kind: "fetching" } }))
		})
		setState(ready({ items: [], pagination: { kind: "more", load } }))

		await waitFor(() => expect(load).toHaveBeenCalledTimes(1))
		expect(container.firstElementChild).toHaveAttribute("aria-busy", "true")
		expect(screen.getByRole("list").querySelector("li")).toHaveAttribute(
			"aria-hidden",
			"true",
		)

		setState(ready({ items: [2], pagination: { kind: "end" } }))
		expect(screen.getByRole("listitem")).toHaveTextContent("Entry 2")
		expect(screen.getByText("No more entries")).toBeVisible()
	})

	it("offers a refresh retry for a cached empty list", () => {
		expect.hasAssertions()
		const retry = vi.fn<() => void>()
		const { setState } = renderList(
			ready({ items: [], pagination: { kind: "refresh-error", retry } }),
		)
		retry.mockImplementation(() => {
			setState(ready({ items: [], pagination: { kind: "end" } }))
		})

		expect(screen.getByText("Failed to refresh entries.")).toHaveRole("status")
		expect(screen.queryByText(EMPTY_MESSAGE)).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: "Retry" }))

		expect(retry).toHaveBeenCalledTimes(1)
		expect(screen.getByText(EMPTY_MESSAGE)).toHaveRole("status")
		expect(screen.queryByText("No more entries")).not.toBeInTheDocument()
	})
})
