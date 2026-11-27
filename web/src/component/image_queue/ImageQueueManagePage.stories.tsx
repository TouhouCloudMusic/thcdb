import { createWritableMemo } from "@solid-primitives/memo"
import { createMemo } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { vImageQueueStatus, vImageQueueType } from "~/hey-api/valibot.gen"
import { ready } from "~/type/asyncData"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { ImageQueueManagePageContent } from "~/view/image_queue/manage"
import type { ImageQueueFilters } from "~/view/image_queue/manage"

import { STORY_ENTRIES } from "./ImageQueueManagePage.story-data"

function StoryRoot(props: ImageQueueFilters) {
	const [filters, setFilters] = createWritableMemo(() => ({
		type: props.type,
		status: props.status,
	}))
	const list = createMemo(() => {
		const { type, status } = filters()
		const items = STORY_ENTRIES.filter(
			(entry) =>
				(type === undefined || entry.type === type)
				&& (status === undefined || entry.item.status === status),
		).map(({ item }) => item)

		return ready({ items, pagination: { kind: "end" as const } })
	})

	return (
		<ImageQueueManagePageContent
			filters={filters()}
			list={list()}
			onTypeChange={(type) => setFilters((current) => ({ ...current, type }))}
			onStatusChange={(status) =>
				setFilters((current) => ({ ...current, status }))
			}
		/>
	)
}

const meta = {
	title: "Page/ImageQueueManagePage",
	component: StoryRoot,
	decorators: [withStoryRouter],
	parameters: {
		layout: StoryLayout.FullScreen,
		tanstackRouter: {
			initialEntry: "/image-queue/?status=all&type=release",
		},
	},
	argTypes: {
		status: {
			control: { type: "radio" },
			options: [undefined, ...vImageQueueStatus.options],
		},
		type: {
			control: { type: "select" },
			options: [undefined, ...vImageQueueType.options],
		},
	},
	args: {
		type: "release",
	},
} satisfies Meta<typeof StoryRoot>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
