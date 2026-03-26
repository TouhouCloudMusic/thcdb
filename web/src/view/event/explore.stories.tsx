import type { Event } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { createMockEvent } from "~/mock/event"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { EventItem } from "~/view/event/EventItem"

const EXPLORE_PAGE_PADDING_CLASS = "px-8"

const DEFAULT_EVENT = createMockEvent(34, {
	name: "Hakurei Jinja Reitaisai",
	start_date: {
		precision: "Day",
		value: "2026-05-05",
	},
	end_date: {
		precision: "Day",
		value: "2026-05-06",
	},
	short_description:
		"Flagship fan event with new doujin music releases and live performances.",
	location: {
		country: "Japan",
		province: "Tokyo",
		city: "Tokyo Big Sight",
	},
})

type StoryRootProps = {
	event: Event
}

function StoryRoot(props: StoryRootProps) {
	return (
		<div class={`w-[560px] bg-primary ${EXPLORE_PAGE_PADDING_CLASS}`}>
			<EventItem event={props.event} />
		</div>
	)
}

const meta = {
	title: "View/Explore/Event",
	component: StoryRoot,
	decorators: [withStoryRouter],
	parameters: {
		layout: StoryLayout.Centered,
		backgrounds: {
			grid: {
				disable: true,
			},
		},
	},
	globals: {
		backgrounds: {
			value: "studio",
		},
	},
	argTypes: {
		event: {
			control: false,
		},
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Item: Story = {
	args: {
		event: DEFAULT_EVENT,
	},
}
