import type { Release } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { createMockRelease } from "~/mock/release"
import { ENGLISH_LANGUAGE } from "~/storybook/fixtures"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import {
	ReleaseGridItem,
	ReleaseItem,
} from "~/view/release/explore/ReleaseItems"

const EXPLORE_PAGE_PADDING_CLASS = "px-8"
const STORY_LOCALE = "en"

const LIST_RELEASE = createMockRelease(31, {
	title: "緋色の鼓動",
	localized_titles: [
		{
			language: ENGLISH_LANGUAGE,
			title: "Scarlet Beat",
		},
	],
	release_type: "Album",
	cover_art_url: "/img/cover/release/1.png",
	release_date: {
		precision: "Day",
		value: "2025-08-17",
	},
	catalog_nums: [
		{
			catalog_number: "SH-2025-01",
			label: { id: 1, name: "SOUND HOLIC" },
		},
		{
			catalog_number: "709-0817",
			label: { id: 2, name: "Seven Nine Seconds" },
		},
		{
			catalog_number: "RB-17",
			label: null,
		},
	],
	events: [
		{
			id: 1,
			name: "Hakurei Jinja Reitaisai",
		},
	],
	artists: [
		{ id: 1, name: "SOUND HOLIC" },
		{ id: 2, name: "Nana Takahashi" },
		{ id: 3, name: "709sec." },
	],
})

const GRID_RELEASE = createMockRelease(32, {
	title: "月面シフト",
	localized_titles: [
		{
			language: ENGLISH_LANGUAGE,
			title: "Lunar Shift",
		},
	],
	release_type: "Ep",
	cover_art_url: "/img/cover/release/1.png",
	release_date: {
		precision: "Month",
		value: "2024-11-01",
	},
	artists: [
		{ id: 1, name: "Halozy" },
		{ id: 2, name: "Aki Misawa" },
	],
})

type StoryRootProps = {
	release: Release
}

function ReleaseListStoryRoot(props: StoryRootProps) {
	return (
		<div class={`w-[720px] bg-primary ${EXPLORE_PAGE_PADDING_CLASS}`}>
			<ReleaseItem
				release={props.release}
				locale={STORY_LOCALE}
			/>
		</div>
	)
}

function ReleaseGridStoryRoot(props: StoryRootProps) {
	return (
		<div class={`w-52 bg-primary py-8 ${EXPLORE_PAGE_PADDING_CLASS}`}>
			<ReleaseGridItem
				release={props.release}
				locale={STORY_LOCALE}
			/>
		</div>
	)
}

const meta = {
	title: "View/Explore/Release",
	component: ReleaseListStoryRoot,
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
} satisfies Meta<typeof ReleaseListStoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const List: Story = {
	args: {
		release: LIST_RELEASE,
	},
	render: ReleaseListStoryRoot,
}

export const Grid: Story = {
	args: {
		release: GRID_RELEASE,
	},
	render: ReleaseGridStoryRoot,
}
