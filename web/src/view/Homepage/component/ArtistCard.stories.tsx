import type { Artist } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { createMockArtist } from "~/mock/artist"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { ArtistCard } from "./ArtistCard"

const DEFAULT_ARTIST = createMockArtist(4, {
	name: "SOUND HOLIC",
	artist_type: "Multiple",
	profile_image_url: "/avatar.png",
})

const NO_IMAGE_ARTIST: Artist = {
	...DEFAULT_ARTIST,
	id: 5,
	name: "ZUN",
	artist_type: "Solo",
	profile_image_url: null,
}

type StoryRootProps = {
	artist: Artist
}

function StoryRoot(props: StoryRootProps) {
	return (
		<div class="w-40">
			<ArtistCard artist={props.artist} />
		</div>
	)
}

const meta = {
	title: "View/Homepage/ArtistCard",
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

export const Default: Story = {
	args: {
		artist: DEFAULT_ARTIST,
	},
}

export const NoImage: Story = {
	args: {
		artist: NO_IMAGE_ARTIST,
	},
}
