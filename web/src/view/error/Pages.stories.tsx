import { MetaProvider } from "@solidjs/meta"
import type { Meta, StoryObj } from "storybook-solidjs-vite"
import { createJSXDecorator } from "storybook-solidjs-vite"

import { StoryLayout } from "~/utils/adapter/storybook"
import { NotFound } from "~/view/NotFound"

import { InternalServerError } from "./InternalServerError"

const meta = {
	title: "View/Error",
	component: NotFound,
	decorators: [
		createJSXDecorator((Story) => (
			<MetaProvider>
				<Story />
			</MetaProvider>
		)),
	],
	parameters: { layout: StoryLayout.FullScreen },
} satisfies Meta<typeof NotFound>

export default meta
type Story = StoryObj<typeof meta>
export const NotFoundPage: Story = {}
export const InternalServerErrorPage: Story = {
	render: () => <InternalServerError msg="Failed to load release data." />,
}
