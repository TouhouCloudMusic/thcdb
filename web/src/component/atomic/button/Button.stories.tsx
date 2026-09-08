import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { Button } from "~/component/atomic/button"
import type { ButtonProps } from "~/component/atomic/button"

const meta: Meta<ButtonProps> = {
	component: Button,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	argTypes: {
		appearance: {
			control: "select",
			options: ["solid", "soft", "ghost", "surface", "outline"],
		},
		tone: {
			control: "select",
			options: ["gray", "slate", "blue", "reimu", "marisa", "green"],
		},
		size: { control: "select", options: ["xs", "sm", "md", "lg"] },
	},
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: { children: "Button", appearance: "soft", tone: "gray", size: "md" },
}
