import type { Label } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { createMockLabel } from "~/mock/label"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { LabelItem } from "./explore.comp"

const EXPLORE_PAGE_PADDING_CLASS = "px-8"

const DEFAULT_LABEL = createMockLabel(35, {
	name: "THCDB Records",
	founded_date: {
		precision: "Year",
		value: "2011-01-01",
	},
	dissolved_date: undefined,
})

type StoryRootProps = {
	label: Label
}

function StoryRoot(props: StoryRootProps) {
	return (
		<div class={`w-[560px] bg-primary ${EXPLORE_PAGE_PADDING_CLASS}`}>
			<LabelItem label={props.label} />
		</div>
	)
}

const meta = {
	title: "View/Explore/Label",
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
		label: {
			control: false,
		},
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Item: Story = {
	args: {
		label: DEFAULT_LABEL,
	},
}
