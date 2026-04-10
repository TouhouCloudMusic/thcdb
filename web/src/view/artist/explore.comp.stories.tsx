import type { Artist } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { createMockArtist } from "~/mock/artist"
import { ENGLISH_LANGUAGE } from "~/storybook/fixtures"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { ArtistItem } from "./explore.comp"

const EXPLORE_PAGE_PADDING_CLASS = "px-8"

const DEFAULT_ARTIST = createMockArtist(30, {
	name: "Alstroemeria Records",
	artist_type: "Multiple",
	profile_image_url: "/avatar.png",
	start_date: {
		precision: "Year",
		value: "2004-01-01",
	},
	end_date: undefined,
	current_location: {
		country: "Japan",
		province: "Tokyo",
		city: "Shinjuku",
	},
	localized_names: [
		{
			language: ENGLISH_LANGUAGE,
			name: "Masayoshi Minoshima",
		},
	],
})

type StoryRootProps = {
	artist: Artist
}

function StoryRoot(props: StoryRootProps) {
	return (
		<div class={`w-[520px] bg-primary ${EXPLORE_PAGE_PADDING_CLASS}`}>
			<ArtistItem artist={props.artist} />
		</div>
	)
}

const meta = {
	title: "View/Explore/Artist",
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
		artist: {
			control: false,
		},
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Item: Story = {
	args: {
		artist: DEFAULT_ARTIST,
	},
}
