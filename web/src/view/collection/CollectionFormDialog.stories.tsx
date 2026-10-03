import { createSignal } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { Button } from "~/component/atomic/button"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { withStoryState } from "~/utils/adapter/storybook-state"

import { CollectionFormDialog } from "./CollectionFormDialog"

function StoryRoot() {
	const [open, setOpen] = createSignal(true)
	return (
		<>
			<Button onClick={() => setOpen(true)}>Create collection</Button>
			<CollectionFormDialog
				open={open()}
				onOpenChange={setOpen}
			/>
		</>
	)
}

const meta = {
	title: "View/Collection/CollectionFormDialog",
	component: StoryRoot,
	decorators: [withStoryState, withStoryRouter],
	parameters: { layout: StoryLayout.Centered },
} satisfies Meta<typeof StoryRoot>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
