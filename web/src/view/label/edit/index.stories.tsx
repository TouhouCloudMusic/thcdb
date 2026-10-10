import type { Label } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { withStoryApi } from "~/storybook/api"
import { withEntityDetailStoryState } from "~/storybook/entityDetail"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { EditLabelPage } from "."

const LABEL: Label = {
	id: 9,
	name: "Rolling Contact",
	links: [],
	founders: [
		{ id: 18, name: "Rolling Contact" },
		{ id: 41, name: "天音" },
	],
	localized_names: [],
	founded_date: { precision: "Month", value: "2008-01-01" },
	dissolved_date: null,
}

const meta = {
	title: "View/Label/Edit",
	component: EditLabelPage,
	decorators: [
		withEntityDetailStoryState,
		withStoryRouter,
		withStoryApi({
			"/api/languages": Response.json({ status: "Ok", data: [] }),
		}),
	],
	parameters: { layout: StoryLayout.FullScreen },
	args: { type: "edit", label: LABEL },
} satisfies Meta<typeof EditLabelPage>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
