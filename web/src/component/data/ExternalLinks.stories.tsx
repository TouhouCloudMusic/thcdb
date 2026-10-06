import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { StoryLayout } from "~/utils/adapter/storybook"

import { ExternalLinks } from "./ExternalLinks"

const meta = {
	title: "Component/Data/ExternalLinks",
	component: ExternalLinks,
	parameters: {
		layout: StoryLayout.Padded,
	},
} satisfies Meta<typeof ExternalLinks>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		links: [
			"https://example.com/catalog/42",
			"http://archive.example.com/items/42",
		],
	},
}
