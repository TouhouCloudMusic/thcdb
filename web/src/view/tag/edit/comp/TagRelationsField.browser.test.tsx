import { createForm, getInput } from "@formisch/solid"
import {
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@solidjs/testing-library"
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import type { Tag } from "@thc/api"
import { http, HttpResponse } from "msw/http"
import { afterEach, assert, beforeEach, describe, expect, it } from "vitest"
import { userEvent } from "vitest/browser"

import { createMockTag } from "~/mock/tag"
import { I18NProvider } from "~/state/i18n"
import { loadLocale } from "~/state/i18n/runtime"
import { worker } from "~/test/browser"

import { TagFormProvider } from "../context"
import { TagFormSchema } from "../schema"
import type { TagFormInput } from "../schema"
import { TagFormRelationsField } from "./TagRelationsField"
import type { TagFormStore } from "./types"

const queryClients: QueryClient[] = []

function relationRow(container: HTMLElement, tagName: string) {
	const row = within(container).getByText(tagName).closest("li")
	assert(row)
	return row
}

async function selectTag(
	container: HTMLElement,
	rowTagName: string,
	selectedTagName: string,
) {
	const row = relationRow(container, rowTagName)
	const editButton = within(row)
		.getAllByRole("button")
		.find((button) => button.getAttribute("aria-haspopup") === "dialog")
	assert(editButton)
	await userEvent.click(editButton)

	const dialog = await screen.findByRole("dialog", { name: "Search Tag" })
	await userEvent.fill(
		within(dialog).getByPlaceholderText("Search..."),
		selectedTagName,
	)
	const result = await within(dialog).findByText(selectedTagName)
	const selectButton = result.closest("button")
	assert(selectButton)
	await userEvent.click(selectButton)
	await userEvent.click(within(dialog).getByPlaceholderText("Search..."))
	await userEvent.keyboard("{Escape}")
	await waitFor(() => expect(dialog).not.toBeInTheDocument())
}

async function selectRelationType(
	row: HTMLElement,
	relationType: "Inherit" | "Derive",
) {
	const selectButton = within(row)
		.getAllByRole("button")
		.find((button) => button.getAttribute("aria-haspopup") === "listbox")
	assert(selectButton)
	await userEvent.click(selectButton)
	await userEvent.click(
		await screen.findByRole("option", {
			name: relationType,
		}),
	)
}

async function removeRelation(row: HTMLElement) {
	const buttons = within(row).getAllByRole("button")
	const removeButton = buttons.at(-1)
	assert(removeButton)
	await userEvent.click(removeButton)
}

function renderRelations(
	initialRelations: NonNullable<TagFormInput["data"]["relations"]>,
) {
	let form: TagFormStore | undefined
	const currentTag = createMockTag(99, { name: "Current tag" })
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	})
	queryClients.push(queryClient)
	const rendered = render(() => {
		form = createForm({
			schema: TagFormSchema,
			initialInput: {
				data: {
					relations: initialRelations,
				},
			},
		})

		return (
			<QueryClientProvider client={queryClient}>
				<I18NProvider initialLocale="en">
					<TagFormProvider value={{ formStore: form, tag: currentTag }}>
						<TagFormRelationsField />
					</TagFormProvider>
				</I18NProvider>
			</QueryClientProvider>
		)
	})
	assert(form)
	return { container: rendered.container, form }
}

function mockTagSearch(tags: Tag[]) {
	worker.use(
		http.get("*/api/tag", () =>
			HttpResponse.json({ status: "Ok", data: tags }),
		),
	)
}

describe("tag relations field", () => {
	beforeEach(async () => loadLocale("en"))
	afterEach(() => {
		cleanup()
		for (const queryClient of queryClients) queryClient.clear()
		queryClients.length = 0
	})

	it("edits and removals affect only the selected relation after a deletion", async () => {
		expect.hasAssertions()
		const tagA = createMockTag(1, { name: "Tag A" })
		const tagB = createMockTag(2, { name: "Tag B" })
		const tagC = createMockTag(3, { name: "Tag C" })
		const tagD = createMockTag(4, { name: "Tag D" })
		mockTagSearch([tagA, tagB, tagC, tagD])
		const { container, form } = renderRelations([
			{ tag: tagA, type: "Inherit" },
			{ tag: tagB, type: "Derive" },
			{ tag: tagC, type: "Inherit" },
		])

		await removeRelation(relationRow(container, "Tag A"))
		await selectTag(container, "Tag B", "Tag D")
		await selectRelationType(relationRow(container, "Tag D"), "Inherit")

		expect(getInput(form, { path: ["data", "relations"] })).toStrictEqual([
			{ tag: tagD, type: "Inherit" },
			{ tag: tagC, type: "Inherit" },
		])

		await removeRelation(relationRow(container, "Tag C"))
		expect(getInput(form, { path: ["data", "relations"] })).toStrictEqual([
			{ tag: tagD, type: "Inherit" },
		])
	})

	it("relation choices prevent self-reference and duplicate targets", async () => {
		expect.hasAssertions()
		const tagInRow = createMockTag(1, { name: "Tag in this row" })
		const tagInOtherRow = createMockTag(2, { name: "Tag in another row" })
		const availableTag = createMockTag(3, { name: "Tag available" })
		const currentTag = createMockTag(99, { name: "Current tag" })
		mockTagSearch([currentTag, tagInOtherRow, tagInRow, availableTag])
		const { container } = renderRelations([
			{ tag: tagInRow, type: "Inherit" },
			{ tag: tagInOtherRow, type: "Derive" },
		])

		const row = relationRow(container, tagInRow.name)
		const editButton = within(row)
			.getAllByRole("button")
			.find((button) => button.getAttribute("aria-haspopup") === "dialog")
		assert(editButton)
		await userEvent.click(editButton)

		const dialog = await screen.findByRole("dialog", { name: "Search Tag" })
		await userEvent.fill(
			within(dialog).getByPlaceholderText("Search..."),
			"Tag",
		)

		await within(dialog).findByText(tagInRow.name)
		await within(dialog).findByText(availableTag.name)
		expect(within(dialog).queryByText(currentTag.name)).not.toBeInTheDocument()
		expect(
			within(dialog).queryByText(tagInOtherRow.name),
		).not.toBeInTheDocument()
	})
})
