import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import dayjs from "dayjs"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { Header } from "~/component/Header"
import { createMockArtists } from "~/mock/artist"
import { createMockEvent } from "~/mock/event"
import { createMockReleases } from "~/mock/release"
import { createMockTags } from "~/mock/tag"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { HomePage } from "."

const RELEASES_LIMIT = 6
const ARTISTS_LIMIT = 6
const TAGS_LIMIT = 14
const EVENTS_LIMIT = 6

function createHomeStoryQueryClient() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				staleTime: Number.POSITIVE_INFINITY,
			},
		},
	})
	const today = dayjs().format("YYYY-MM-DD")
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

	queryClient.setQueryData(["home::metadata"], {
		artists_count: 12_480,
		releases_count: 38_912,
		songs_count: 186_730,
		tags_count: 2_406,
	})
	queryClient.setQueryData(
		["home::latest-releases", RELEASES_LIMIT],
		createMockReleases(RELEASES_LIMIT, 101),
	)
	queryClient.setQueryData(
		["home::latest-artists", ARTISTS_LIMIT],
		createMockArtists(ARTISTS_LIMIT, 101),
	)
	queryClient.setQueryData(
		["home::trending-tags", TAGS_LIMIT],
		createMockTags(TAGS_LIMIT, 101),
	)
	queryClient.setQueryData(
		["home::upcoming-events", today, EVENTS_LIMIT],
		events,
	)

	return queryClient
}

const STORY_QUERY_CLIENT = createHomeStoryQueryClient()

function StoryRoot() {
	return (
		<QueryClientProvider client={STORY_QUERY_CLIENT}>
			<div class="min-h-dvh bg-slate-100">
				<Header />
				<HomePage />
			</div>
		</QueryClientProvider>
	)
}

const meta = {
	title: "View/Homepage",
	component: StoryRoot,
	decorators: [withStoryRouter],
	parameters: {
		layout: StoryLayout.FullScreen,
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
