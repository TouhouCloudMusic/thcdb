import type { Meta, StoryObj } from "storybook-solidjs"
import { StoryLayout } from "~/utils/adapter/storybook"

import { Input } from "../input"
import { MinimapLayout } from "./Layout"

const meta: Meta<typeof MinimapLayout> = {
	component: MinimapLayout,
	parameters: {
		layout: StoryLayout.Centered,
	},
	tags: ["autodocs"],
	argTypes: {},
}

export default meta
type Story = StoryObj<typeof MinimapLayout>

export const Default: Story = {
	args: {
		labels: ["Name", "Email"],
		fields: [
			(props) => (
				<div class="flex flex-col">
					<label for={props.label}>{props.label}</label>
					<Input
						id={props.label}
						{...props}
					/>
				</div>
			),
			(props) => (
				<div class="flex flex-col">
					<label for={props.label}>{props.label}</label>
					<Input
						id={props.label}
						{...props}
					/>
				</div>
			),
		],
		children: (props) => <form class={props.class}>{props.children}</form>,
	},
}
