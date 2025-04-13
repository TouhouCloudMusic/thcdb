import type { Meta, StoryObj } from "storybook-solidjs"
import { StoryLayout } from "~/utils/adapter/storybook"

import { ChartFilter } from "."

const meta: Meta<typeof ChartFilter> = {
	component: ChartFilter,
	parameters: {
		layout: StoryLayout.Centered,
	},
	tags: ["autodocs"],
	argTypes: {},
}

export default meta
type Story = StoryObj<typeof ChartFilter>

export const Default: Story = {
	render: (args) => <ChartFilter {...args} />,
	args: {
		pos_tags: [
			[
				{
					name: "Piano",
					id: 0,
				},
				{
					name: "Violin",
					id: 0,
				},
			],
			[
				{
					name: "Metal",
					id: 0,
				},
			],
		],
		neg_tags: [
			[
				{
					name: "Rap",
					id: 0,
				},
				{
					name: "Trap",
					id: 0,
				},
			],
			[
				{
					name: "Drill",
					id: 0,
				},
			],
		],
	},
}
