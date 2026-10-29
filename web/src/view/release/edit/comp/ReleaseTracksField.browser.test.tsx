import { createForm, getInput } from "@formisch/solid"
import {
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@solidjs/testing-library"
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import type { ReleaseTrack } from "@thc/api"
import { http, HttpResponse } from "msw/http"
import { afterEach, assert, beforeEach, describe, expect, it } from "vitest"
import { userEvent } from "vitest/browser"

import { createMockArtist } from "~/mock/artist"
import {
	createMockNamedReference,
	createMockSongReference,
} from "~/mock/reference"
import { I18NProvider } from "~/state/i18n"
import { loadLocale } from "~/state/i18n/runtime"
import { worker } from "~/test/browser"

import { ReleaseFormSchema } from "../schema"
import { ReleaseTracksField } from "./ReleaseTracksField"
import type { ReleaseFormStore } from "./types"

describe("release track field", () => {
	beforeEach(async () => loadLocale("en"))
	afterEach(cleanup)

	it("artist selections stay with their tracks during editing", async () => {
		expect.hasAssertions()
		const selectedArtist = createMockArtist(20)
		const initialArtist = createMockNamedReference(10)
		const remainingArtist = createMockNamedReference(11)
		const initialTrack: ReleaseTrack = {
			id: 1,
			disc_id: 1,
			song: createMockSongReference(100),
			artists: [initialArtist, remainingArtist],
		}
		const removedTrack: ReleaseTrack = {
			id: 2,
			disc_id: 1,
			song: createMockSongReference(101),
			artists: [],
		}
		const queryClient = new QueryClient({
			defaultOptions: { queries: { staleTime: Infinity } },
		})
		worker.use(
			http.get("*/api/artist", () =>
				HttpResponse.json({
					status: "Ok",
					data: [selectedArtist],
				}),
			),
		)
		let form: ReleaseFormStore | undefined
		const rendered = render(() => {
			form = createForm({
				schema: ReleaseFormSchema,
				initialInput: {
					data: {
						discs: [{ name: "Disc A" }, { name: "Disc B" }],
						tracks: [
							{ song: removedTrack.song, disc_index: 0, artists: [] },
							{
								song: initialTrack.song,
								disc_index: 0,
								artists: initialTrack.artists ?? [],
							},
						],
						credits: [],
					},
				},
			})
			return (
				<QueryClientProvider client={queryClient}>
					<I18NProvider initialLocale="en">
						<ReleaseTracksField of={form} />
					</I18NProvider>
				</QueryClientProvider>
			)
		})
		const removeArtist = async (name: string) => {
			const artistRow = within(rendered.container).getByText(name).closest("li")
			assert(artistRow)

			await userEvent.click(within(artistRow).getByRole("button"))
		}

		await removeArtist(initialArtist.name)

		const trackRow = within(rendered.container)
			.getByText(initialTrack.song.title)
			.closest("li")
		assert(trackRow)
		const header = within(trackRow).getByText("Track Artists").parentElement
		assert(header)

		await userEvent.click(within(header).getByRole("button"))
		const dialog = await screen.findByRole("dialog", { name: "Search Artist" })

		await userEvent.fill(
			within(dialog).getByPlaceholderText("Search..."),
			selectedArtist.name,
		)
		await userEvent.click(
			await within(dialog).findByRole("button", { name: selectedArtist.name }),
		)
		await userEvent.click(within(dialog).getByPlaceholderText("Search..."))
		await userEvent.keyboard("{Escape}")
		await waitFor(() => expect(dialog).not.toBeInTheDocument())

		await userEvent.click(screen.getByRole("button", { name: "Next disc" }))
		await within(rendered.container).findByText("No tracks under this disc.")

		await userEvent.click(screen.getByRole("button", { name: "Previous disc" }))

		for (const label of [selectedArtist.name, remainingArtist.name]) {
			expect(within(rendered.container).getByText(label)).toBeVisible()
		}

		expect(
			within(rendered.container).queryByText(initialArtist.name),
		).not.toBeInTheDocument()

		const removedRow = within(rendered.container)
			.getByText(removedTrack.song.title)
			.closest("li")
		assert(removedRow)
		const [removeTrackButton] = within(removedRow).getAllByRole("button")
		assert(removeTrackButton)
		await userEvent.click(removeTrackButton)

		await removeArtist(remainingArtist.name)

		assert(form)
		expect(getInput(form, { path: ["data", "tracks"] })).toMatchObject([
			{
				song: { id: initialTrack.song.id },
				artists: [{ id: selectedArtist.id }],
			},
		])

		expect(
			within(rendered.container).queryByText(remainingArtist.name),
		).not.toBeInTheDocument()
	})
})
