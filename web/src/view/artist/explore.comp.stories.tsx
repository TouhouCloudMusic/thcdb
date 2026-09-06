import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { Divider } from "~/component/atomic/Divider"
import { Intersperse } from "~/component/data/Intersperse"
import { ExplorePageLayout } from "~/component/feature/entity_explore"
import type { ArtistListItem } from "~/hey-api"
import {
	ARTIST_IMAGE_CREDITS,
	IOSYS_ARTIST,
	TOKYO_ACTIVE_NEETS_ARTIST,
	ZUN_ARTIST,
} from "~/storybook/fixtures"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { ArtistItem } from "./ArtistItem"

const ARTISTS: ArtistListItem[] = [
	IOSYS_ARTIST,
	TOKYO_ACTIVE_NEETS_ARTIST,
	ZUN_ARTIST,
]

type StoryRootProps = {
	artists: ArtistListItem[]
	width: "full" | "narrow"
}

function StoryRoot(props: StoryRootProps) {
	return (
		<div
			class={`mx-auto w-full ${props.width === "narrow" ? "max-w-sm" : "max-w-3xl"}`}
		>
			<ExplorePageLayout
				title="Explore Artists"
				action={{ to: "/artist/new", label: "Create artist" }}
			>
				<div class="flex flex-col gap-2 p-4">
					<Intersperse
						of={props.artists}
						with={<Divider horizontal />}
					>
						{(artist) => <ArtistItem artist={artist} />}
					</Intersperse>
				</div>
			</ExplorePageLayout>
		</div>
	)
}

const meta = {
	title: "View/Explore/Artist",
	component: StoryRoot,
	decorators: [withStoryRouter],
	parameters: {
		layout: StoryLayout.FullScreen,
		docs: { description: { component: ARTIST_IMAGE_CREDITS } },
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
	args: {
		artists: ARTISTS,
		width: "full",
	},
	argTypes: {
		artists: { control: false },
		width: {
			control: "select",
			options: ["full", "narrow"],
		},
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const List: Story = {}

export const FullInformation: Story = {
	args: { artists: [IOSYS_ARTIST] },
}

export const Narrow: Story = {
	args: { width: "narrow" },
}
