import type { Release } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { createMockRelease } from "~/mock/release"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { ReleaseCard } from "./ReleaseCard"

const DEFAULT_RELEASE = createMockRelease(11, {
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
})

const NO_COVER_RELEASE: Release = {
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
	release: Release
}

function StoryRoot(props: StoryRootProps) {
	return (
		<div class="w-72">
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
