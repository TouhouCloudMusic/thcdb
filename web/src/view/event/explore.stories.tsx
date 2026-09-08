import * as stylex from "@stylexjs/stylex"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { Intersperse } from "~/component/data/Intersperse"
import type { EventListItem } from "~/hey-api"
import { dividerStyles } from "~/style/primitives"
import { colors, px } from "~/style/tokens.stylex"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { EventItem } from "~/view/event/EventItem"

const styles = stylex.create({
	story: {
		marginInline: "auto",
		width: "100%",
		backgroundColor: colors.backgroundPrimary,
	},
	narrow: { maxWidth: px[384] },
	wide: { maxWidth: px[768] },
	list: {
		display: "flex",
		flexDirection: "column",
		gap: px[8],
		padding: px[16],
	},
})

const EVENTS: EventListItem[] = [
	{
		id: 34,
		name: "Hakurei Jinja Reitaisai 23",
		start_date: { precision: "Day", value: "2026-05-05" },
		end_date: { precision: "Day", value: "2026-05-06" },
		short_description:
			"Flagship fan event with new doujin music releases and live performances.",
		location: {
			country: "Japan",
			province: "Tokyo",
			city: "Tokyo Big Sight",
		},
	},
	{
		id: 35,
		name: "M3-2026 Spring Doujin Music Exhibition and Live Performance Showcase",
		start_date: { precision: "Day", value: "2026-04-26" },
		end_date: null,
		short_description:
			"Independent circles present new albums, arrange collections, and live performances throughout the day.",
		location: {
			country: "Japan",
			province: "Tokyo",
			city: "Tokyo Ryutsu Center",
		},
	},
	{
		id: 36,
		name: "Comic Market 106",
		start_date: null,
		end_date: null,
		short_description: "",
		location: {},
	},
]

type StoryRootProps = {
	events: EventListItem[]
	width: "full" | "narrow"
}

function StoryRoot(props: StoryRootProps) {
	return (
		<div
			{...stylex.attrs(
				styles.story,
				props.width === "narrow" ? styles.narrow : styles.wide,
			)}
		>
			<div {...stylex.attrs(styles.list)}>
				<Intersperse
					of={props.events}
					with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
				>
					{(event) => <EventItem event={event} />}
				</Intersperse>
			</div>
		</div>
	)
}

const meta = {
	title: "View/Explore/Event",
	component: StoryRoot,
	decorators: [withStoryRouter],
	parameters: {
		layout: StoryLayout.FullScreen,
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
	args: {
		events: EVENTS,
		width: "full",
	},
	argTypes: {
		events: { control: false },
		width: {
			control: "select",
			options: ["full", "narrow"],
		},
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const List: Story = {}

export const Narrow: Story = {
	args: { width: "narrow" },
}
