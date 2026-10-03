import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { withStoryApi } from "~/storybook/api"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { withStoryState } from "~/utils/adapter/storybook-state"

import { Header } from "."

const meta = {
	title: "Component/Header",
	component: Header,
	decorators: [
		withStoryState,
		withStoryRouter,
		withStoryApi({
			"/api/profile": Response.json(
				{ status: "Unauthorized" },
				{ status: 401 },
			),
		}),
	],
	parameters: { layout: StoryLayout.FullScreen },
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
