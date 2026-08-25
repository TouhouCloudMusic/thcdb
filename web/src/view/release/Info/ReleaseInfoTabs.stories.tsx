import type { Release } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { createMockRelease } from "~/mock/release"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { withStoryState } from "~/utils/adapter/storybook-state"
import { createMockEntityComments } from "~/view/comment/storybook"

import { ReleaseInfoTabsView } from "./ReleaseInfoTabs"

type StoryRootProps = {
	release: Release
	activeTab: string
}

function StoryRoot(props: StoryRootProps) {
	return (
		<div class="w-[960px] border border-slate-200 bg-white">
			<ReleaseInfoTabsView
				release={props.release}
				activeTab={props.activeTab}
				comments={createMockEntityComments()}
				onActiveTabChange={() => undefined}
			/>
		</div>
	)
}

const meta = {
	title: "View/Release/InfoTabs",
	component: StoryRoot,
	decorators: [withStoryState, withStoryRouter],
	parameters: {
		layout: StoryLayout.Padded,
	},
	argTypes: {
		release: { control: false },
		activeTab: { control: false },
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const WithTracksAndCredits: Story = {
	args: {
		activeTab: "Tracks",
		release: createMockRelease(22, {
			title: "Scarlet Archive",
			release_type: "Album",
			discs: [
				{ id: 1, name: "Disc One" },
				{ id: 2, name: "Bonus Disc" },
			],
			tracks: [
				{
					id: 1,
					disc_id: 1,
					track_number: "01",
					display_title: "Night of Knights",
					duration: 277000,
					song: { id: 901, title: "Night of Knights" },
					artists: [{ id: 1, name: "COOL&CREATE" }],
				},
				{
					id: 2,
					disc_id: 1,
					track_number: "02",
					display_title: null,
					duration: 243000,
					song: { id: 902, title: "Bad Apple!!" },
					artists: [{ id: 2, name: "SOUND HOLIC" }],
				},
				{
					id: 3,
					disc_id: 2,
					track_number: "01",
					display_title: "Border of Life - Live",
					duration: 318000,
					song: { id: 903, title: "Border of Life" },
					artists: [{ id: 3, name: "Demetori" }],
				},
			],
			credits: [
				{
					artist: { id: 1, name: "709sec." },
					role: { id: 1, name: "Vocals" },
					on: [1, 2],
				},
				{
					artist: { id: 2, name: "DJ Command" },
					role: { id: 2, name: "Arrangement" },
					on: [1],
				},
				{
					artist: { id: 1, name: "709sec." },
					role: { id: 3, name: "Lyrics" },
					on: [2],
				},
			],
		}),
	},
}

export const TracksOnly: Story = {
	args: {
		activeTab: "Tracks",
		release: createMockRelease(24, {
			title: "Transient Signal",
			release_type: "Ep",
			discs: [{ id: 1, name: "Disc One" }],
			tracks: [
				{
					id: 1,
					disc_id: 1,
					track_number: "01",
					display_title: null,
					duration: 260000,
					song: { id: 904, title: "Phantom Ensemble" },
					artists: [{ id: 9, name: "Alstroemeria Records" }],
				},
			],
			credits: [],
		}),
	},
}

export const CreditsOnly: Story = {
	args: {
		activeTab: "Credits",
		release: createMockRelease(23, {
			title: "Live At Hakurei Shrine",
			release_type: "Single",
			tracks: [],
			credits: [
				{
					artist: { id: 8, name: "ZUN" },
					role: { id: 4, name: "Original Composition" },
					on: null,
				},
			],
		}),
	},
}

export const Empty: Story = {
	args: {
		activeTab: "Comments",
		release: createMockRelease(25, {
			title: "Blank Archive",
			release_type: "Other",
			tracks: [],
			credits: [],
		}),
	},
}
