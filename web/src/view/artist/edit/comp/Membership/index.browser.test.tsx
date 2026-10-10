import { createForm, getInput, reset } from "@formisch/solid"
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

import type { CreditRoleRef, SimpleArtist } from "~/hey-api"
import { createMockNamedReference } from "~/mock/reference"
import { I18NProvider } from "~/state/i18n"
import { loadLocale } from "~/state/i18n/runtime"
import { worker } from "~/test/browser"

import { ArtistFormMembership } from "."
import { ArtistFormProvider } from "../../context"
import type { ArtistEditFormContextValue } from "../../context"
import { ArtistFormSchema } from "../../schema"

const queryClients: QueryClient[] = []
const selectedArtist = createMockNamedReference(4)
const selectedRoles = {
	first: createMockNamedReference(14),
	second: createMockNamedReference(15),
}

type TestMembership = {
	artist: SimpleArtist
	roles: [CreditRoleRef]
	tenure: { join_year: number; leave_year: number }[]
}

function createMembership(id: number, joinYear: number, leaveYear: number) {
	return {
		artist: createMockNamedReference(id),
		roles: [createMockNamedReference(id + 10)],
		tenure: [{ join_year: joinYear, leave_year: leaveYear }],
	} satisfies TestMembership
}

function renderMemberships(memberships: TestMembership[]) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	})
	queryClients.push(queryClient)
	let createdForm: ArtistEditFormContextValue["formStore"] | undefined
	const rendered = render(() => {
		createdForm = createForm({
			schema: ArtistFormSchema,
			initialInput: {
				data: {
					artist_type: "Solo",
					memberships,
				},
			},
		})
		return (
			<QueryClientProvider client={queryClient}>
				<I18NProvider initialLocale="en">
					<ArtistFormProvider value={{ artistId: 100, formStore: createdForm }}>
						<ArtistFormMembership />
					</ArtistFormProvider>
				</I18NProvider>
			</QueryClientProvider>
		)
	})
	const form = createdForm
	assert(form)

	const header = within(rendered.container).getByText(
		"Membership",
	).parentElement
	assert(header)
	const list = header.parentElement?.querySelector("ul")
	assert(list)
	const rowFor = (artistName: string) => {
		const row = within(list).getByText(artistName).closest("li")
		assert(row)
		return row
	}

	return {
		form,
		header,
		list,
		rowFor,
	}
}

async function addMembership(header: HTMLElement, artist: SimpleArtist) {
	worker.use(
		http.get("*/api/artist", () =>
			HttpResponse.json({
				status: "Ok",
				data: [{ ...artist, artist_type: "Multiple" }],
			}),
		),
	)
	await userEvent.click(within(header).getByRole("button"))
	const dialog = await screen.findByRole("dialog", { name: "Search Artist" })
	await userEvent.fill(
		within(dialog).getByPlaceholderText("Search..."),
		artist.name,
	)
	await userEvent.click(
		await within(dialog).findByRole("button", { name: artist.name }),
	)
	await userEvent.click(within(dialog).getByPlaceholderText("Search..."))
	await userEvent.keyboard("{Escape}")
	await waitFor(() => expect(dialog).not.toBeInTheDocument())
}

async function addRole(row: HTMLElement, role: CreditRoleRef) {
	worker.use(
		http.get("*/api/credit-role/summary", () =>
			HttpResponse.json({
				status: "Ok",
				data: [{ ...role, short_description: "" }],
			}),
		),
	)
	await userEvent.fill(
		within(row).getByPlaceholderText("Search roles..."),
		role.name,
	)
	await userEvent.click(await screen.findByRole("option", { name: role.name }))
	await userEvent.fill(within(row).getByPlaceholderText("Search roles..."), "")
}

function tenureYears(row: HTMLElement) {
	return within(row)
		.getAllByRole<HTMLInputElement>("spinbutton")
		.map((input) => input.value)
}

describe("artist memberships", () => {
	beforeEach(() => loadLocale("en"))
	afterEach(() => {
		cleanup()
		for (const queryClient of queryClients) queryClient.clear()
		queryClients.length = 0
	})

	it("selecting a role updates only the chosen group membership", async () => {
		expect.hasAssertions()
		const existing = createMembership(1, 2001, 2009)
		const { form, header, rowFor } = renderMemberships([existing])
		await addMembership(header, selectedArtist)
		await addRole(rowFor(selectedArtist.name), selectedRoles.first)
		expect(
			within(rowFor(existing.artist.name)).getByText(existing.roles[0].name),
		).toBeVisible()
		expect(
			within(rowFor(selectedArtist.name)).getByText(selectedRoles.first.name),
		).toBeVisible()
		expect(getInput(form, { path: ["data", "memberships"] })).toStrictEqual([
			existing,
			{
				artist: selectedArtist,
				roles: [selectedRoles.first],
				tenure: [],
			},
		])
	})

	it("removing a membership preserves the other memberships' roles and tenure", async () => {
		expect.hasAssertions()
		const first = createMembership(1, 2001, 2009)
		const second = createMembership(2, 2010, 2020)
		const third = createMembership(99, 2017, 2021)
		third.tenure.push({ join_year: 2022, leave_year: 2023 })
		const { form, rowFor } = renderMemberships([first, second, third])

		await userEvent.click(
			within(rowFor(first.artist.name)).getByRole("button", { name: "" }),
		)
		expect(getInput(form, { path: ["data", "memberships"] })).toStrictEqual([
			second,
			third,
		])
		const thirdRow = within(rowFor(third.artist.name))
		await userEvent.click(thirdRow.getByRole("button", { name: "Remove role" }))
		await addRole(rowFor(third.artist.name), selectedRoles.second)
		await userEvent.click(thirdRow.getByRole("button", { name: "Add Tenure" }))
		const addedTenure = thirdRow
			.getAllByRole("button", { name: "Remove tenure entry" })[2]
			?.closest("li")
		assert(addedTenure)
		await userEvent.fill(
			within(addedTenure).getByPlaceholderText("Join year"),
			"2024",
		)
		await userEvent.fill(
			within(addedTenure).getByPlaceholderText("Leave year"),
			"2025",
		)
		const [, removeSecondTenure] = thirdRow.getAllByRole("button", {
			name: "Remove tenure entry",
		})
		assert(removeSecondTenure)
		await userEvent.click(removeSecondTenure)

		expect(getInput(form, { path: ["data", "memberships"] })).toStrictEqual([
			second,
			{
				artist: third.artist,
				roles: [selectedRoles.second],
				tenure: [
					{ join_year: 2017, leave_year: 2021 },
					{ join_year: 2024, leave_year: 2025 },
				],
			},
		])
		thirdRow.getByText(selectedRoles.second.name)
		expect(tenureYears(rowFor(third.artist.name))).toStrictEqual([
			"2017",
			"2021",
			"2024",
			"2025",
		])
		const secondRow = rowFor(second.artist.name)
		within(secondRow).getByText(second.roles[0].name)
		expect(tenureYears(secondRow)).toStrictEqual(["2010", "2020"])
	})

	it("reset restores the original group memberships", async () => {
		expect.hasAssertions()
		const original = createMembership(1, 2001, 2009)
		const { form, header, list, rowFor } = renderMemberships([original])
		await addMembership(header, selectedArtist)
		await addRole(rowFor(selectedArtist.name), selectedRoles.first)
		await userEvent.click(
			within(rowFor(original.artist.name)).getByRole("button", { name: "" }),
		)

		reset(form)
		expect(getInput(form, { path: ["data", "memberships"] })).toStrictEqual([
			original,
		])
		const restoredRow = rowFor(original.artist.name)
		within(restoredRow).getByText(original.roles[0].name)
		expect(tenureYears(restoredRow)).toStrictEqual(["2001", "2009"])
		expect(within(list).queryByText(selectedArtist.name)).toBeNull()

		await addRole(rowFor(original.artist.name), selectedRoles.first)
		expect(getInput(form, { path: ["data", "memberships"] })).toStrictEqual([
			{
				artist: original.artist,
				roles: [original.roles[0], selectedRoles.first],
				tenure: original.tenure,
			},
		])
		within(rowFor(original.artist.name)).getByText(selectedRoles.first.name)
	})
})
