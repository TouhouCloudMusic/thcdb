import type { Artist, ArtistCredit, Discography, ReleaseType } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { createMockArtist } from "~/mock/artist"
import type { InfiniteQuery } from "~/type/query"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { withStoryState } from "~/utils/adapter/storybook-state"
import { createMockEntityComments } from "~/view/comment/storybook"

import { ArtistContext } from ".."
import { ArtistReleaseInfoView } from "./ArtistReleaseInfo"

async function noop() {
	await Promise.resolve()
}

function createInfiniteQuery<T>(data: T[]): InfiniteQuery<T> {
	return {
		data,
		hasNext: false,
		next: noop,
		isLoading: false,
	}
}

function createDiscographyRecord(
	seed: Partial<Record<ReleaseType, Discography[]>>,
): Record<ReleaseType, Discography[]> {
	return {
		Album: seed.Album ?? [],
		Compilation: seed.Compilation ?? [],
		Demo: seed.Demo ?? [],
		Ep: seed.Ep ?? [],
		Other: seed.Other ?? [],
		Single: seed.Single ?? [],
	}
}

const STORY_ARTIST: Artist = createMockArtist(18, {
	name: "SOUND HOLIC",
	artist_type: "Multiple",
})

function createDiscographyItem(
	releaseId: number,
	title: string,
	releaseType: ReleaseType,
): Discography {
	return {
		release_id: releaseId,
		title,
		release_type: releaseType,
		release_date: null,
		artist: [{ id: STORY_ARTIST.id, name: STORY_ARTIST.name }],
		cover_url: null,
	}
}

const DISCOGRAPHY_ITEMS: Discography[] = [
	{
		release_id: 101,
		title: "幻想郷 Groove Station",
		release_type: "Album",
		release_date: { precision: "Day", value: "2024-08-12" },
		artist: [{ id: STORY_ARTIST.id, name: STORY_ARTIST.name }],
		cover_url: "/img/cover/release/1.png",
	},
	{
		release_id: 102,
		title: "Lunatic Night Drive",
		release_type: "Album",
		release_date: { precision: "Month", value: "2023-11-01" },
		artist: [{ id: STORY_ARTIST.id, name: STORY_ARTIST.name }],
		cover_url: null,
	},
]

const APPEARANCE_ITEMS: Discography[] = [
	{
		release_id: 201,
		title: "Scarlet Session",
		release_type: "Compilation",
		release_date: { precision: "Day", value: "2025-05-05" },
		artist: [
			{ id: 88, name: "ShibayanRecords" },
			{ id: STORY_ARTIST.id, name: STORY_ARTIST.name },
		],
		cover_url: "/img/cover/release/1.png",
	},
]

const CREDIT_ITEMS: ArtistCredit[] = [
	{
		release_id: 301,
		title: "Borderline Archive",
		release_type: "Single",
		release_date: { precision: "Year", value: "2022-01-01" },
		artist: [{ id: 55, name: "CYTOKINE" }],
		roles: [{ id: 1, name: "Arrangement" }],
		cover_url: null,
	},
]

type StoryRootProps = {
	artist: Artist
	discographies: Record<ReleaseType, Discography[]>
	appearances: Discography[]
	credits: ArtistCredit[]
}

function StoryRoot(props: StoryRootProps) {
	const contextValue = {
		get artist() {
			return props.artist
		},
		get appearances() {
			return createInfiniteQuery(props.appearances)
		},
		get credits() {
			return createInfiniteQuery(props.credits)
		},
		discographies: {
			get data() {
				return props.discographies
			},
			hasNext() {
				return false
			},
			next: noop,
			isLoading: false,
		},
	}

	return (
		<div class="w-full max-w-[960px] border border-slate-200 bg-white">
			<ArtistContext.Provider value={contextValue}>
				<ArtistReleaseInfoView
					activeTab="Discography"
					comments={createMockEntityComments()}
					onActiveTabChange={() => undefined}
				/>
			</ArtistContext.Provider>
		</div>
	)
}

const meta = {
	title: "View/Artist/ReleaseInfoTabs",
	component: StoryRoot,
	decorators: [withStoryState, withStoryRouter],
	parameters: {
		layout: StoryLayout.Padded,
	},
	argTypes: {
		artist: { control: false },
		discographies: { control: false },
		appearances: { control: false },
		credits: { control: false },
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const WithAllTabs: Story = {
	args: {
		artist: STORY_ARTIST,
		discographies: createDiscographyRecord({
			Album: DISCOGRAPHY_ITEMS,
			Compilation: [
				createDiscographyItem(104, "Scarlet Archive", "Compilation"),
			],
			Demo: [createDiscographyItem(105, "Demo 2019", "Demo")],
			Ep: [
				{
					release_id: 103,
					title: "Dream Layer EP",
					release_type: "Ep",
					release_date: { precision: "Day", value: "2021-10-24" },
					artist: [{ id: STORY_ARTIST.id, name: STORY_ARTIST.name }],
					cover_url: null,
				},
			],
			Other: [createDiscographyItem(106, "Live Session", "Other")],
			Single: [createDiscographyItem(107, "Moonlit Signal", "Single")],
		}),
		appearances: APPEARANCE_ITEMS,
		credits: CREDIT_ITEMS,
	},
}

export const EmptyDiscography: Story = {
	args: {
		artist: STORY_ARTIST,
		discographies: createDiscographyRecord({}),
		appearances: [],
		credits: [],
	},
}
