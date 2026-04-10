import type { ImageQueueType } from "@thc/api"
import { createMemo, createSignal, Show } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import {
	ImageQueueManagePageContent,
	STATUS_FILTER_OPTIONS,
	TYPE_OPTIONS,
} from "~/view/image_queue/manage"
import type { StatusFilterKind } from "~/view/image_queue/manage"

import { PENDING_COUNT, STORY_ENTRIES } from "./ImageQueueManagePage.story-data"

const PAGE_SIZE = 20

type ImageQueueSearch = {
	status: StatusFilterKind
	type?: ImageQueueType
}

type StoryRootProps = ImageQueueSearch

function StoryRoot(props: StoryRootProps) {
	return (
		<Show
			when={{ status: props.status, type: props.type }}
			keyed
		>
			{(filters) => <StoryScene initialFilters={filters} />}
		</Show>
	)
}

function StoryScene(props: { initialFilters: ImageQueueSearch }) {
	const [filters, setFilters] = createSignal(props.initialFilters)
	const filteredEntries = createMemo(() => {
		const currentFilters = filters()

		return STORY_ENTRIES.filter((entry) => {
			if (
				currentFilters.type !== undefined
				&& entry.type !== currentFilters.type
			) {
				return false
			}

			return (
				currentFilters.status !== "pending" || entry.item.status === "Pending"
			)
		})
	})
	const items = createMemo(() =>
		filteredEntries()
			.slice(0, PAGE_SIZE)
			.map((entry) => entry.item),
	)

	return (
		<ImageQueueManagePageContent
			filters={filters()}
			pendingCount={PENDING_COUNT}
			items={items()}
			isListLoading={false}
			isListError={false}
			isFetchingNextPage={false}
			hasNextPage={filteredEntries().length > PAGE_SIZE}
			onTypeChange={(value) => {
				setFilters((current) => ({
					...current,
					type: value === "all" ? undefined : value,
				}))
			}}
			onStatusChange={(value) => {
				setFilters((current) => ({
					...current,
					status: value,
				}))
			}}
			onLoadNextPage={() => null}
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
			options: STATUS_FILTER_OPTIONS,
		},
		type: {
			control: { type: "select" },
			options: [undefined, ...TYPE_OPTIONS],
		},
	},
	args: {
		status: "all",
		type: "release",
	},
} satisfies Meta<typeof StoryRoot>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
