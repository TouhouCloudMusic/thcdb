import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { StoryLayout } from "~/utils/adapter/storybook"

import { Footer } from "."

const meta: Meta<typeof Footer> = {
	component: Footer,
	parameters: {
		layout: StoryLayout.Padded,
	},
	// tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Footer>

export const Default: Story = {
	render: () => (
		<div style={{ width: "100%", height: "100%" }}>
			<Footer />
		</div>
	),
}
