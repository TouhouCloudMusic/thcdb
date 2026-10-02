import * as stylex from "@stylexjs/stylex"
import type { Release } from "@thc/api"
import { createSignal } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { CRADLE_RELEASE, CRADLE_RELEASE_DESCRIPTION } from "~/storybook/release"
import { palette } from "~/style/color/palette.stylex"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { withStoryState } from "~/utils/adapter/storybook-state"
import { createMockEntityComments } from "~/view/comment/storybook"

import { ReleaseInfoTabsView } from "./ReleaseInfoTabs"

const styles = stylex.create({
	preview: {
		width: "100%",
		maxWidth: "960px",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[200],
		backgroundColor: palette.white,
	},
})

type StoryRootProps = {
	release: Release
}

function StoryRoot(props: StoryRootProps) {
	const [activeTab, setActiveTab] = createSignal("Tracks")
	const comments = createMockEntityComments()

	return (
		<div {...stylex.attrs(styles.preview)}>
			<ReleaseInfoTabsView
				release={props.release}
				activeTab={activeTab()}
				comments={comments}
				onActiveTabChange={setActiveTab}
			/>
		</div>
	)
}

const meta = {
	title: "View/Release/InfoTabs",
	component: StoryRoot,
	decorators: [withStoryState, withStoryRouter],
	parameters: {
		layout: StoryLayout.Padded,
		docs: {
			description: {
				story: CRADLE_RELEASE_DESCRIPTION,
			},
		},
	},
	argTypes: {
		release: { control: "object" },
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: { release: CRADLE_RELEASE },
}

export const Empty: Story = {
	args: {
		release: { ...CRADLE_RELEASE, tracks: [] },
	},
}
