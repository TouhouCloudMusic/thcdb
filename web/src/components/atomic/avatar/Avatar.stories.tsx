import type { Meta, StoryObj } from "storybook-solidjs"

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
			last_login: "",
		},
	},
}
export const Fallback: Story = {
	args: {
		user: {
			name: "Cirno",
			last_login: "",
		},
	},
}
