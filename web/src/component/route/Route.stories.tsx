import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { withStoryApi } from "~/storybook/api"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { withStoryState } from "~/utils/adapter/storybook-state"

import { AuthGuard, SessionLoading } from "../route"

const meta = {
	title: "Component/Route",
	component: AuthGuard,
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
} satisfies Meta<typeof AuthGuard>

export default meta
type Story = StoryObj<typeof meta>
export const AuthRequired: Story = {}
export const Loading: Story = { render: () => <SessionLoading /> }
