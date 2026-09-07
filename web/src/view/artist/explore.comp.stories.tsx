import * as stylex from "@stylexjs/stylex"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { Intersperse } from "~/component/data/Intersperse"
import { ExplorePageLayout } from "~/component/feature/entity_explore"
import type { ArtistListItem } from "~/hey-api"
import {
	ARTIST_IMAGE_CREDITS,
	IOSYS_ARTIST,
	TOKYO_ACTIVE_NEETS_ARTIST,
	ZUN_ARTIST,
} from "~/storybook/fixtures"
import { dividerStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { ArtistItem } from "./ArtistItem"

const styles = stylex.create({
	story: {
		marginInline: "auto",
		width: "100%",
	},
	narrow: {
		maxWidth: px[384],
	},
	wide: {
		maxWidth: px[768],
	},
	results: {
		display: "flex",
		flexDirection: "column",
		gap: px[8],
		padding: px[16],
	},
})

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
			{...stylex.attrs(
				styles.story,
				props.width === "narrow" ? styles.narrow : styles.wide,
			)}
		>
			<ExplorePageLayout
				title="Explore Artists"
				action={{ to: "/artist/new", label: "Create artist" }}
			>
				<div {...stylex.attrs(styles.results)}>
					<Intersperse
						of={props.artists}
						with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
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
