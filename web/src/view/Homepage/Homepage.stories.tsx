import { RouterContextProvider } from "@tanstack/solid-router"
import dayjs from "dayjs"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { Header } from "~/component/Header"
import { createMockArtists } from "~/mock/artist"
import { createMockEvent } from "~/mock/event"
import { createMockReleases } from "~/mock/release"
import { createMockTags } from "~/mock/tag"
import { createStoryRouter } from "~/utils/adapter/storybook"
import { HomePage } from "~/view/Homepage"
import {
	ARTISTS_LIMIT,
	EVENTS_LIMIT,
	RELEASES_LIMIT,
	TAGS_LIMIT,
} from "~/view/Homepage/constants"

const STORY_ROUTER = createStoryRouter()

function createHomeStoryData() {
	const releases = createMockReleases(RELEASES_LIMIT, 101)
	for (const release of releases.slice(RELEASES_LIMIT / 2)) {
		release.cover_art_url = null
	}
	const events = Array.from({ length: EVENTS_LIMIT }, (_, index) =>
		createMockEvent(201 + index, {
			start_date: {
				precision: "Day",
				value: dayjs()
					.add(index + 1, "week")
					.format("YYYY-MM-DD"),
			},
			end_date: undefined,
		}),
	)

	return {
		metadata: {
			artists_count: 12_480,
			releases_count: 38_912,
			songs_count: 186_730,
			tags_count: 2_406,
		},
		releases,
		artists: createMockArtists(ARTISTS_LIMIT, 101),
		tags: createMockTags(TAGS_LIMIT, 101),
		events,
	}
}

const STORY_DATA = createHomeStoryData()

function StoryRoot() {
	return (
		<RouterContextProvider router={STORY_ROUTER}>
			{() => (
				<div class="min-h-dvh bg-slate-100">
					<Header />
					<HomePage {...STORY_DATA} />
				</div>
			)}
		</RouterContextProvider>
	)
}

const meta = {
	title: "View/Homepage",
	component: StoryRoot,
	parameters: {
		layout: "fullscreen",
		backgrounds: {
			grid: {
				disable: true,
			},
		},
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
