import type { Label } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { MOCK_CORRECTION_HISTORY } from "~/mock/correction"
import { withEntityDetailStoryState } from "~/storybook/entityDetail"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { LabelInfoPage } from "."

const LABEL: Label = {
	links: [],
	id: 9,
	name: "Rolling Contact",
	founded_date: { precision: "Month", value: "2008-01-01" },
	dissolved_date: null,
	localized_names: [
		{
			language: { id: 1, code: "ja", name: "Japanese" },
			name: "ローリング・コンタクト",
		},
		{
			language: { id: 2, code: "en", name: "English" },
			name: "Rolling Contact Records",
		},
		{
			language: { id: 3, code: "zh-Hans", name: "Simplified Chinese" },
			name: "滚动接触唱片",
		},
	],
	founders: [18, 41, 42],
}

function StoryRoot() {
	return (
		<div class="min-h-[900px] bg-slate-100 p-6">
			<LabelInfoPage
				label={LABEL}
				correctionHistory={MOCK_CORRECTION_HISTORY}
			/>
		</div>
	)
}

const meta = {
	title: "View/Label",
	component: StoryRoot,
	decorators: [withEntityDetailStoryState, withStoryRouter],
	parameters: {
		layout: StoryLayout.FullScreen,
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
