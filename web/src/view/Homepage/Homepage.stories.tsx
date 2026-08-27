import { Dialog as K_Dialog } from "@kobalte/core"
import { Link } from "@tanstack/solid-router"
import dayjs from "dayjs"
import { HamburgerMenuIcon, MagnifyingGlassIcon } from "solid-radix-icons"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { LeftSidebarView } from "~/component/Header/LeftSidebar"
import { Divider } from "~/component/atomic/Divider"
import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"
import { createMockArtists } from "~/mock/artist"
import { createMockEvent } from "~/mock/event"
import { createMockReleases } from "~/mock/release"
import { createMockTags } from "~/mock/tag"
import { StoryRouterProvider } from "~/utils/adapter/storybook"
import { HomePage } from "~/view/Homepage"
import {
	ARTISTS_LIMIT,
	EVENTS_LIMIT,
	RELEASES_LIMIT,
	TAGS_LIMIT,
} from "~/view/Homepage/constants"

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

function StoryHeader() {
	return (
		<header class="border-b border-slate-300 bg-primary px-4 py-2">
			<div
				class="grid min-h-8 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-y-2
					xl:flex xl:justify-between"
			>
				<div class="flex items-center gap-3">
					<Dialog.Root>
						<K_Dialog.Trigger
							variant="Tertiary"
							class="m-auto size-fit p-1"
							as={Button}
						>
							<HamburgerMenuIcon class="m-auto size-5 text-slate-400" />
						</K_Dialog.Trigger>
						<Dialog.Portal>
							<Dialog.Overlay />
							<K_Dialog.Content class="fixed inset-0 z-50 w-fit">
								<LeftSidebarView />
							</K_Dialog.Content>
						</Dialog.Portal>
					</Dialog.Root>

					<Divider
						vertical
						class="h-6"
					/>
				</div>

				<div
					class="relative col-span-3 col-start-1 row-start-2 grid items-center
						sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:w-full sm:max-w-96 sm:justify-self-center
						xl:ml-36"
				>
					<input
						type="search"
						aria-label="Search artists, releases, songs"
						placeholder="Search artists, releases, songs…"
						class="mr-auto h-7 w-full rounded-xs bg-slate-100 pl-7 outline-transparent"
					/>
					<MagnifyingGlassIcon class="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
				</div>

				<div class="col-start-3 row-start-1 flex h-full shrink place-content-center items-center gap-3">
					<Divider
						vertical
						class="h-6"
					/>
					<div class="grid grid-cols-2 gap-3">
						<Button
							variant="Tertiary"
							class="px-3 py-1 text-sm text-slate-900"
							type="button"
						>
							<Link
								to="/auth"
								search={{ type: "sign_in" }}
							>
								Sign In
							</Link>
						</Button>
						<Button
							variant="Primary"
							class="px-3 py-1 text-sm"
							type="button"
						>
							<Link
								to="/auth"
								search={{ type: "sign_up" }}
							>
								Sign Up
							</Link>
						</Button>
					</div>
				</div>
			</div>
		</header>
	)
}

function StoryRoot() {
	return (
		<StoryRouterProvider>
			<div class="min-h-dvh bg-slate-100">
				<StoryHeader />
				<HomePage {...STORY_DATA} />
			</div>
		</StoryRouterProvider>
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
