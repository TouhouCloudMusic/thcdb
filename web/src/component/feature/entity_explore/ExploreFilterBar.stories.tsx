import { createSignal, For, Show } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { StoryLayout } from "~/utils/adapter/storybook"

import { ExploreFilter } from "./ExploreFilter"
import { ExploreFilterBar } from "./ExploreFilterBar"
import { GridListViewPicker } from "./GridListViewPicker"
import type { ViewMode } from "./GridListViewPicker"

const FILTER_OPTIONS = [
	{ value: "all", label: "All" },
	{ value: "active", label: "Active" },
	{ value: "pending", label: "Pending approval" },
]

function StorySelect(props: { index: number }) {
	const [value, setValue] = createSignal("all")

	return (
		<ExploreFilter
			label={`Filter ${props.index + 1}`}
			value={value()}
			defaultValue="all"
			options={FILTER_OPTIONS}
			onChange={setValue}
		/>
	)
}

type FilterBarStoryProps = {
	selectCount: number
	showViewPicker: boolean
}

function FilterBarStory(props: FilterBarStoryProps) {
	const [view, setView] = createSignal<ViewMode>("grid")

	return (
		<div class="min-h-screen bg-primary p-8">
			<ExploreFilterBar
				actions={
					<Show when={props.showViewPicker}>
						<GridListViewPicker
							value={view()}
							onChange={setView}
						/>
					</Show>
				}
			>
				<For
					each={Array.from({ length: props.selectCount }, (_, index) => index)}
				>
					{(index) => <StorySelect index={index} />}
				</For>
			</ExploreFilterBar>
		</div>
	)
}

const meta = {
	title: "Component/Feature/ExploreFilterBar",
	component: FilterBarStory,
	args: {
		selectCount: 3,
		showViewPicker: true,
	},
	argTypes: {
		selectCount: {
			control: { type: "number", min: 0, step: 1 },
		},
		showViewPicker: {
			control: "boolean",
		},
	},
	parameters: {
		layout: StoryLayout.FullScreen,
		backgrounds: {
			grid: { disable: true },
		},
	},
	globals: {
		backgrounds: { value: "studio" },
	},
} satisfies Meta<typeof FilterBarStory>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
