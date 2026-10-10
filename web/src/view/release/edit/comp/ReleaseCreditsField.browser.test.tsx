import { createForm, getInput } from "@formisch/solid"
import {
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@solidjs/testing-library"
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import type { ReleaseCredit, ReleaseTrack } from "@thc/api"
import { http, HttpResponse } from "msw/http"
import { afterEach, assert, beforeEach, describe, expect, it } from "vitest"
import { userEvent } from "vitest/browser"

import {
	createMockNamedReference,
	createMockSongReference,
} from "~/mock/reference"
import { I18NProvider } from "~/state/i18n"
import { loadLocale } from "~/state/i18n/runtime"
import { worker } from "~/test/browser"

import { ReleaseFormSchema } from "../schema"
import { ReleaseCreditsField } from "./ReleaseCreditsField"
import { ReleaseTracksField } from "./ReleaseTracksField"
import type { ReleaseFormStore } from "./types"

const initialCredits: [ReleaseCredit, ReleaseCredit, ReleaseCredit] = [
	{
		artist: createMockNamedReference(1),
		role: createMockNamedReference(11),
		on: [0],
	},
	{
		artist: createMockNamedReference(2),
		role: createMockNamedReference(12),
		on: [1],
	},
	{
		artist: createMockNamedReference(3),
		role: createMockNamedReference(13),
		on: null,
	},
]
const firstSong = createMockSongReference(100)

const initialTracks: ReleaseTrack[] = [
	{ id: 1, disc_id: 1, song: firstSong, artists: [] },
	{ id: 2, disc_id: 1, song: createMockSongReference(200), artists: [] },
]
const selectedArtist = createMockNamedReference(4)
const selectedRole = createMockNamedReference(14)

async function selectSearchResult(
	trigger: HTMLElement | undefined,
	title: string,
	name: string,
) {
	assert(trigger)
	await userEvent.click(trigger)
	const dialog = await screen.findByRole("dialog", { name: title })
	const input = within(dialog).getByPlaceholderText("Search...")
	await userEvent.fill(input, name)
	await userEvent.click(await within(dialog).findByRole("button", { name }))
	await userEvent.keyboard("{Escape}")
	await waitFor(() => expect(dialog).not.toBeInTheDocument())
}

describe("release credits", () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	})

	beforeEach(async () => loadLocale("en"))
	afterEach(() => {
		cleanup()
		queryClient.clear()
	})

	it("credits refer to the checked tracks regardless of disc grouping", async () => {
		expect.hasAssertions()
		let form: ReleaseFormStore | undefined
		render(() => {
			form = createForm({
				schema: ReleaseFormSchema,
				initialInput: {
					data: {
						tracks: [
							{ song: firstSong, disc_index: 1 },
							{ song: createMockSongReference(200), disc_index: 0 },
						],
						credits: [initialCredits[0]],
					},
				},
			})

			return (
				<QueryClientProvider client={queryClient}>
					<I18NProvider initialLocale="en">
						<ReleaseCreditsField of={form} />
					</I18NProvider>
				</QueryClientProvider>
			)
		})
		assert(form)
		const firstDiscTrack = screen.getByRole("checkbox", {
			name: "Disc 1 Track 1",
		})
		const secondDiscTrack = screen.getByRole("checkbox", {
			name: "Disc 2 Track 1",
		})
		expect(screen.getAllByRole("checkbox", { checked: true })).toStrictEqual([
			secondDiscTrack,
		])

		await userEvent.click(firstDiscTrack)
		expect(getInput(form).data.credits[0]?.on).toStrictEqual([0, 1])
		await userEvent.click(secondDiscTrack)
		expect(getInput(form).data.credits[0]?.on).toStrictEqual([1])
		expect(screen.getAllByRole("checkbox", { checked: true })).toStrictEqual([
			firstDiscTrack,
		])
	})

	it("artists and roles stay associated with their credits during editing", async () => {
		expect.hasAssertions()
		worker.use(
			http.get("*/api/artist", () =>
				HttpResponse.json({
					status: "Ok",
					data: [{ ...selectedArtist, artist_type: "Solo" }],
				}),
			),
			http.get("*/api/credit-role/summary", () =>
				HttpResponse.json({
					status: "Ok",
					data: [{ ...selectedRole, short_description: "" }],
				}),
			),
		)
		let createdForm: ReleaseFormStore | undefined
		render(() => {
			createdForm = createForm({
				schema: ReleaseFormSchema,
				initialInput: {
					data: {
						discs: [{ name: "Disc" }],
						tracks: initialTracks.map((track) => ({
							song: track.song,
							disc_index: 0,
							artists: [],
						})),
						credits: initialCredits,
					},
				},
			})

			return (
				<QueryClientProvider client={queryClient}>
					<I18NProvider initialLocale="en">
						<ReleaseTracksField of={createdForm} />
						<ReleaseCreditsField of={createdForm} />
					</I18NProvider>
				</QueryClientProvider>
			)
		})
		const form = createdForm
		assert(form)
		const creditsHeader = screen.getByText("Credits").parentElement
		assert(creditsHeader)
		const creditsField = creditsHeader.parentElement
		assert(creditsField)
		const creditRows = () => within(creditsField).getAllByRole("listitem")

		const expectCredits = (
			expected: Pick<ReleaseCredit, "artist" | "role">[],
		) => {
			const rows = creditRows()
			expect(rows).toHaveLength(expected.length)

			for (const [index, credit] of expected.entries()) {
				const rowElement = rows[index]
				assert(rowElement)
				const row = within(rowElement)
				expect(row.getByText(credit.artist.name)).toBeVisible()
				expect(row.getByText(credit.role.name)).toBeVisible()
			}

			expect(getInput(form, { path: ["data", "credits"] })).toMatchObject(
				expected.map(({ artist, role }) => ({ artist, role })),
			)
		}

		const trackRow = screen.getByText(firstSong.title).closest("li")
		assert(trackRow)
		const [removeTrackButton] = within(trackRow).getAllByRole("button")
		assert(removeTrackButton)
		await userEvent.click(removeTrackButton)

		expectCredits([initialCredits[1], initialCredits[2]])

		const [survivingCreditRow] = creditRows()
		assert(survivingCreditRow)
		await userEvent.click(within(survivingCreditRow).getByRole("checkbox"))
		expect(getInput(form, { path: ["data", "credits"] })).toStrictEqual([
			{
				artist: initialCredits[1].artist,
				role: initialCredits[1].role,
				on: [],
			},
			{
				artist: initialCredits[2].artist,
				role: initialCredits[2].role,
				on: null,
			},
		])

		await userEvent.click(within(creditsHeader).getByRole("button"))
		const newRow = creditRows()[2]
		assert(newRow)
		expect(within(newRow).getByText("Select artist")).toBeVisible()
		expect(within(newRow).getByText("Select role")).toBeVisible()
		expect(getInput(form, { path: ["data", "credits", 2] })).toStrictEqual({
			artist: undefined,
			role: undefined,
			on: undefined,
		})

		await selectSearchResult(
			within(newRow).getAllByRole("button")[0],
			"Search Artist",
			selectedArtist.name,
		)
		await selectSearchResult(
			within(newRow).getAllByRole("button")[1],
			"Search Role",
			selectedRole.name,
		)

		const [firstCreditRow] = creditRows()
		assert(firstCreditRow)
		const removeCreditButton = within(firstCreditRow).getAllByRole("button")[2]
		assert(removeCreditButton)
		await userEvent.click(removeCreditButton)
		expectCredits([
			initialCredits[2],
			{ artist: selectedArtist, role: selectedRole },
		])
	})
})
