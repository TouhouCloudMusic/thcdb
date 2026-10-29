import { createForm, getInput } from "@formisch/solid"
import {
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@solidjs/testing-library"
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import { http, HttpResponse } from "msw/http"
import { afterEach, assert, beforeEach, describe, expect, it } from "vitest"
import { userEvent } from "vitest/browser"

import { createMockLabel } from "~/mock/label"
import { createMockNamedReference } from "~/mock/reference"
import { I18NProvider } from "~/state/i18n"
import { loadLocale } from "~/state/i18n/runtime"
import { worker } from "~/test/browser"

import { ReleaseFormSchema } from "../schema"
import { ReleaseCatalogNumbersField } from "./ReleaseCatalogNumbersField"
import type { ReleaseFormStore } from "./types"

describe("release catalog numbers", () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	})

	beforeEach(async () => loadLocale("en"))
	afterEach(() => {
		cleanup()
		queryClient.clear()
	})

	it("label assignments stay with their catalog numbers", async () => {
		expect.hasAssertions()
		const initialLabels = [
			createMockNamedReference(10),
			createMockNamedReference(11),
		] as const
		const selectedLabel = createMockLabel(12)
		worker.use(
			http.get("*/api/label", () =>
				HttpResponse.json({ status: "Ok", data: [selectedLabel] }),
			),
		)
		let createdForm: ReleaseFormStore | undefined
		const rendered = render(() => {
			createdForm = createForm({
				schema: ReleaseFormSchema,
				initialInput: {
					data: {
						catalog_nums: [
							{ catalog_number: "CAT-A", label: initialLabels[0] },
							{ catalog_number: "CAT-B", label: initialLabels[1] },
							{ catalog_number: "CAT-X", label: undefined },
						],
					},
				},
			})

			return (
				<QueryClientProvider client={queryClient}>
					<I18NProvider initialLocale="en">
						<ReleaseCatalogNumbersField of={createdForm} />
					</I18NProvider>
				</QueryClientProvider>
			)
		})
		const form = createdForm
		assert(form)

		const catalogRow = (catalogNumber: string) => {
			const row = within(rendered.container)
				.getByDisplayValue(catalogNumber)
				.closest("li")
			assert(row)
			return row
		}

		const expectRows = (expected: [string, number | undefined, string?][]) => {
			const rows = within(rendered.container).getAllByRole("listitem")
			expect(rows).toHaveLength(expected.length)

			for (const [index, [catalogNumber, , labelName]] of expected.entries()) {
				const row = rows[index]
				assert(row)
				expect(within(row).getByRole("textbox")).toHaveValue(catalogNumber)
				expect(
					within(row).getByText(labelName ?? "No label selected"),
				).toBeVisible()
			}

			expect(getInput(form, { path: ["data", "catalog_nums"] })).toMatchObject(
				expected.map(([catalog_number, id, name]) => ({
					catalog_number,
					label: id === undefined ? undefined : { id, name },
				})),
			)
		}

		const selectLabel = async (catalogNumber: string) => {
			const [trigger] = within(catalogRow(catalogNumber)).getAllByRole("button")
			assert(trigger)
			await userEvent.click(trigger)
			const dialog = await screen.findByRole("dialog", { name: "Search Label" })
			await userEvent.fill(
				within(dialog).getByPlaceholderText("Search..."),
				selectedLabel.name,
			)
			await userEvent.click(
				await within(dialog).findByRole("button", { name: selectedLabel.name }),
			)
			await userEvent.keyboard("{Escape}")
			await waitFor(() => expect(dialog).not.toBeInTheDocument())
		}

		expectRows([
			["CAT-A", 10, initialLabels[0].name],
			["CAT-B", 11, initialLabels[1].name],
			["CAT-X", undefined],
		])

		await selectLabel("CAT-B")
		expectRows([
			["CAT-A", 10, initialLabels[0].name],
			["CAT-B", 12, selectedLabel.name],
			["CAT-X", undefined],
		])

		const [, removeCatalogA] = within(catalogRow("CAT-A")).getAllByRole(
			"button",
		)
		assert(removeCatalogA)
		await userEvent.click(removeCatalogA)
		await userEvent.fill(
			within(catalogRow("CAT-B")).getByRole("textbox"),
			"CAT-B-EDITED",
		)
		expectRows([
			["CAT-B-EDITED", 12, selectedLabel.name],
			["CAT-X", undefined],
		])
	})
})
