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
	founders: [18, 41],
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
			"/api/artist/18": Response.json({
				status: "Ok",
				data: {
					id: 18,
					name: "Rolling Contact",
					artist_type: "Group",
					links: [],
				},
			}),
			"/api/artist/41": Response.json({
				status: "Ok",
				data: { id: 41, name: "天音", artist_type: "Solo", links: [] },
			}),
		}),
	],
	parameters: { layout: StoryLayout.FullScreen },
	args: { type: "edit", label: LABEL },
} satisfies Meta<typeof EditLabelPage>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
