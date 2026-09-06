import type { Event } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { MOCK_CORRECTION_HISTORY } from "~/mock/correction"
import { withEntityDetailStoryState } from "~/storybook/entityDetail"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { EventInfoPage } from "."

const EVENT: Event = {
	id: 31,
	name: "Hakurei Shrine Reitaisai 21",
	short_description:
		"Annual Touhou Project fan convention for doujin music, games, and art.",
	description: `Hakurei Shrine Reitaisai brings together Touhou Project circles and fans for new releases, performances, games, and illustration.

This edition includes a dedicated doujin music area where circles distribute event-first albums and demo discs.`,
	start_date: { precision: "Day", value: "2024-05-03" },
	end_date: { precision: "Day", value: "2024-05-03" },
	location: {
		country: "Japan",
		province: "Tokyo",
		city: "Koto",
	},
	alternative_names: [
		{ id: 1, name: "例大祭21" },
		{ id: 2, name: "Reitaisai 2024" },
		{ id: 3, name: "博麗神社例大祭 第二十一回" },
	],
}

function StoryRoot() {
	return (
		<div class="min-h-[900px] bg-slate-100 p-6">
			<EventInfoPage
				event={EVENT}
				correctionHistory={MOCK_CORRECTION_HISTORY}
			/>
		</div>
	)
}

const meta = {
	title: "View/Event",
	component: StoryRoot,
	decorators: [withEntityDetailStoryState, withStoryRouter],
	parameters: {
		layout: StoryLayout.FullScreen,
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
