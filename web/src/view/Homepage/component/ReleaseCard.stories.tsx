import * as stylex from "@stylexjs/stylex"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import type { ReleaseListItem } from "~/hey-api"
import { px } from "~/style/tokens.stylex"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { ReleaseCard } from "./ReleaseCard"

const styles = stylex.create({ root: { width: px[288] } })

const DEFAULT_RELEASE: ReleaseListItem = {
	id: 11,
	title: "幻想郷 Tour 2026",
	release_type: "Album",
	cover_art_url: "/img/cover/release/1.png",
	release_date: {
		precision: "Day",
		value: "2026-05-03",
	},
	artists: [
		{ id: 1, name: "SOUND HOLIC" },
		{ id: 2, name: "709sec." },
	],
	catalog_numbers: [],
}

const NO_COVER_RELEASE: ReleaseListItem = {
	...DEFAULT_RELEASE,
	id: 18,
	title: "Untitled Live Tape",
	release_type: "Demo",
	cover_art_url: null,
	release_date: {
		precision: "Year",
		value: "2012-01-01",
	},
	artists: [{ id: 1, name: "Demetori" }],
}

type StoryRootProps = {
	release: ReleaseListItem
}

function StoryRoot(props: StoryRootProps) {
	return (
		<div {...stylex.attrs(styles.root)}>
			<ReleaseCard release={props.release} />
		</div>
	)
}

const meta = {
	title: "View/Homepage/ReleaseCard",
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
		release: {
			control: false,
		},
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		release: DEFAULT_RELEASE,
	},
}

export const NoCover: Story = {
	args: {
		release: NO_COVER_RELEASE,
	},
}
