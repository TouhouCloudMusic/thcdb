import type { Tag } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { MOCK_CORRECTION_HISTORY } from "~/mock/correction"
import { withEntityDetailStoryState } from "~/storybook/entityDetail"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { TagInfoPage } from "."

const TAG: Tag = {
	id: 72,
	name: "Touhou arrangement",
	type: "Scene",
	short_description:
		"Fan-made arrangements derived from music in the Touhou Project series.",
	description: `Touhou arrangement describes music that reinterprets themes from the Touhou Project games. Circles publish these works across electronic, rock, orchestral, vocal, and experimental styles.

The tag applies to both close arrangements and heavily transformed works when the source melody remains identifiable. Use a more specific genre tag alongside it when the production style is known.`,
	alt_names: [
		{ id: 1, name: "Touhou arrange" },
		{ id: 2, name: "東方アレンジ" },
		{ id: 3, name: "Touhou doujin music" },
	],
	relations: [
		{
			tag: { id: 73, name: "Doujin music", type: "Scene" },
			type: "Inherit",
		},
		{
			tag: { id: 74, name: "Touhou vocal", type: "Descriptor" },
			type: "Derive",
		},
		{
			tag: { id: 75, name: "Touhou instrumental", type: "Descriptor" },
			type: "Derive",
		},
	],
}

function StoryRoot() {
	return (
		<div class="min-h-[900px] bg-slate-100 p-6">
			<TagInfoPage
				tag={TAG}
				correctionHistory={MOCK_CORRECTION_HISTORY}
			/>
		</div>
	)
}

const meta = {
	title: "View/Tag",
	component: StoryRoot,
	decorators: [withEntityDetailStoryState, withStoryRouter],
	parameters: {
		layout: StoryLayout.FullScreen,
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
