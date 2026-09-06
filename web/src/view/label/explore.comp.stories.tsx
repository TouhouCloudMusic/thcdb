import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { Divider } from "~/component/atomic/Divider"
import { Intersperse } from "~/component/data/Intersperse"
import type { LabelListItem } from "~/hey-api"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { LabelItem } from "./LabelItem"

const ENGLISH = { id: 1, code: "en", name: "English" }
const JAPANESE = { id: 2, code: "ja", name: "日本語" }

const LABELS: LabelListItem[] = [
	{
		id: 35,
		name: "SOUND HOLIC",
		localized_names: [
			{ language: JAPANESE, name: "サウンドホリック" },
			{ language: ENGLISH, name: "Sound Holic" },
		],
		founders: [
			{ id: 51, name: "GUCCI" },
			{ id: 52, name: "Nana Takahashi" },
		],
		founded_date: { precision: "Year", value: "2006-01-01" },
	},
	{
		id: 36,
		name: "上海アリス幻樂団 — Team Shanghai Alice Music Publishing",
		localized_names: [{ language: ENGLISH, name: "Team Shanghai Alice" }],
		founders: [{ id: 32, name: "ZUN" }],
		founded_date: { precision: "Year", value: "1995-01-01" },
	},
	{
		id: 37,
		name: "A-One",
		localized_names: [],
		founders: [],
		founded_date: null,
	},
]

type StoryRootProps = {
	labels: LabelListItem[]
	width: "full" | "narrow"
}

function StoryRoot(props: StoryRootProps) {
	return (
		<div
			class={`mx-auto w-full bg-primary ${props.width === "narrow" ? "max-w-sm" : "max-w-3xl"}`}
		>
			<div class="flex flex-col gap-2 p-4">
				<Intersperse
					of={props.labels}
					with={<Divider horizontal />}
				>
					{(label) => <LabelItem label={label} />}
				</Intersperse>
			</div>
		</div>
	)
}

const meta = {
	title: "View/Explore/Label",
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
		labels: LABELS,
		width: "full",
	},
	argTypes: {
		labels: { control: false },
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
