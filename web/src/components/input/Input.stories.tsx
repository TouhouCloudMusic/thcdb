import type { Meta, StoryObj } from "storybook-solidjs"
import { StoryLayout } from "~/utils/adapter/storybook"

import { Input } from "."

const meta: Meta<typeof Input> = {
	component: Input,
	parameters: {
		layout: StoryLayout.Centered,
	},
	tags: ["autodocs"],
	args: {
		placeholder: "Enter some text ……",
	},
	argTypes: {},
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
	args: {},
}
export const A: Story = {
	args: {
		class: `
      bg-gray-100 border-none
      `,
	},
}

export const B: Story = {
	render: (args) => (
		<input
			class={`h-8 rounded-t-xs border-b-1 border-slate-400 pl-1.5 transition-all duration-200 outline-none hover:border-reimu-600 focus:border-reimu-600 focus:bg-slate-100`}
			{...args}
		/>
	),
	args: {},
}
