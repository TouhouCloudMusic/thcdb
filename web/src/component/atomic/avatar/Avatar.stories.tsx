import type { Meta, StoryObj } from "storybook-solidjs-vite"

import * as avatar from "."
import baka from "./baka.jpg"

const meta: Meta<typeof avatar.Avatar> = {
	component: avatar.Avatar,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {},
}

export default meta
type Story = StoryObj<typeof avatar.Avatar>

export const Avatar: Story = {
	args: {
		user: {
			avatar_url: baka,
			name: "baka",
		},
	},
}
export const Fallback: Story = {
	args: {
		user: {
			name: "Cirno",
		},
	},
}
