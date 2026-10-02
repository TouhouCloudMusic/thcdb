import * as stylex from "@stylexjs/stylex"
import type { Release } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { MOCK_CORRECTION_HISTORY } from "~/mock/correction"
import { withEntityDetailStoryState } from "~/storybook/entityDetail"
import { CRADLE_RELEASE, CRADLE_RELEASE_DESCRIPTION } from "~/storybook/release"
import { palette } from "~/style/color/palette.stylex"
import { px } from "~/style/tokens.stylex"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { ReleaseInfoPage } from "."

const styles = stylex.create({
	preview: {
		minHeight: "900px",
		backgroundColor: palette.slate[100],
		padding: px[24],
	},
})

function StoryRoot(props: { release: Release }) {
	return (
		<div {...stylex.attrs(styles.preview)}>
			<ReleaseInfoPage
				release={props.release}
				correctionHistory={MOCK_CORRECTION_HISTORY}
			/>
		</div>
	)
}

const meta = {
	title: "View/Release",
	component: StoryRoot,
	decorators: [withEntityDetailStoryState, withStoryRouter],
	parameters: {
		layout: StoryLayout.FullScreen,
		docs: { description: { story: CRADLE_RELEASE_DESCRIPTION } },
	},
	argTypes: { release: { control: "object" } },
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: { release: CRADLE_RELEASE },
}
