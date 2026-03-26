import type { Song } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { createMockSong } from "~/mock/song"
import { ENGLISH_LANGUAGE } from "~/storybook/fixtures"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { SongItem } from "~/view/song/SongItem"

const EXPLORE_PAGE_PADDING_CLASS = "px-8"
const STORY_LOCALE = "en"

const DEFAULT_SONG = createMockSong(33, {
	title: "月まで届け、不死の煙",
	localized_titles: [
		{
			language: ENGLISH_LANGUAGE,
			title: "Reach for the Moon, Immortal Smoke",
		},
	],
	artists: [
		{ id: 1, name: "Demetori" },
		{ id: 2, name: "ZUN" },
	],
})

const ORIGINAL_ONLY_SONG: Song = {
	...DEFAULT_SONG,
	id: 34,
	localized_titles: [],
}

type StoryRootProps = {
	song: Song
}

function StoryRoot(props: StoryRootProps) {
	return (
		<div class={`w-[520px] bg-primary ${EXPLORE_PAGE_PADDING_CLASS}`}>
			<SongItem
				song={props.song}
				locale={STORY_LOCALE}
			/>
		</div>
	)
}

const meta = {
	title: "View/Explore/Song",
	component: StoryRoot,
	decorators: [withStoryRouter],
	parameters: {
		layout: StoryLayout.Centered,
		backgrounds: {
			grid: {
				disable: true,
			},
		},
	},
	globals: {
		backgrounds: {
			value: "studio",
		},
	},
	argTypes: {
		song: {
			control: false,
		},
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Item: Story = {
	args: {
		song: DEFAULT_SONG,
	},
}

export const OriginalOnly: Story = {
	args: {
		song: ORIGINAL_ONLY_SONG,
	},
}
