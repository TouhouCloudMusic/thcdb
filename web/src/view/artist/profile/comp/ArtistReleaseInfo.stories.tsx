import * as stylex from "@stylexjs/stylex"
import type { Artist, Discography, ReleaseType } from "@thc/api"
import { createSignal } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import type { ArtistSongCredit, Credit } from "~/hey-api"
import { createMockArtist } from "~/mock/artist"
import { palette } from "~/style/color/palette.stylex"
import { px } from "~/style/tokens.stylex"
import type { InfiniteQuery } from "~/type/query"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { withStoryState } from "~/utils/adapter/storybook-state"
import { createMockEntityComments } from "~/view/comment/storybook"

import { ArtistContext } from ".."
import {
	ARTIST_CREDITS_STORY_DATA,
	createArtistCreditsStoryModel,
} from "../credits.storybook"
import { ArtistReleaseInfoView } from "./ArtistReleaseInfo"

async function noop() {
	await Promise.resolve()
}

const styles = stylex.create({
	story: {
		display: "grid",
		gridTemplateColumns: `repeat(auto-fill, ${px[32]})`,
		boxSizing: "content-box",
		width: `round(down, calc(100% - 2px), ${px[32]})`,
		maxWidth: "960px",
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: palette.slate[200],
		backgroundColor: palette.white,
	},
})

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

type StoryRootProps = {
	artist: Artist
	discographies: Record<ReleaseType, Discography[]>
	appearances: Discography[]
	credits: Credit[]
	songCredits: ArtistSongCredit[]
	initialTab: string
}

function StoryRoot(props: StoryRootProps) {
	const [activeTab, setActiveTab] = createSignal(props.initialTab)
	const credits = createArtistCreditsStoryModel(() => ({
		release: props.credits,
		song: props.songCredits,
	}))
	const contextValue = {
		get artist() {
			return props.artist
		},
		get appearances() {
			return createInfiniteQuery(props.appearances)
		},
		get credits() {
			return credits
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
		<div {...stylex.attrs(styles.story)}>
			<ArtistContext.Provider value={contextValue}>
				<ArtistReleaseInfoView
					activeTab={activeTab()}
					comments={createMockEntityComments()}
					onActiveTabChange={setActiveTab}
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
	args: { initialTab: "Discography", songCredits: [] },
	argTypes: {
		artist: { control: false },
		discographies: { control: false },
		appearances: { control: false },
		credits: { control: false },
		songCredits: { control: false },
		initialTab: { control: "select", options: ["Discography", "Credit"] },
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
		credits: ARTIST_CREDITS_STORY_DATA.release,
		songCredits: ARTIST_CREDITS_STORY_DATA.song,
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
