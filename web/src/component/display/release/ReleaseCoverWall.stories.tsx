import * as stylex from "@stylexjs/stylex"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { px } from "~/style/tokens.stylex"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { ReleaseCoverWall } from "./ReleaseCoverWall"
import type { ReleaseCoverWallProps } from "./ReleaseCoverWall"

const styles = stylex.create({
	root: {
		display: "grid",
		gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
		gap: px[16],
		width: "100%",
		maxWidth: px[768],
	},
})

const RELEASES: ReleaseCoverWallProps["releases"] = [
	{
		id: 11,
		title: "Embodiment of Scarlet Devil",
		cover_art_url: "/img/cover/release/1.png",
	},
	{
		id: 12,
		title: "Touhou Vocal Collection",
		cover_art_url: null,
	},
	{
		id: 13,
		title: "Live at Hakurei Shrine",
		cover_art_url: null,
	},
]

function StoryRoot(props: ReleaseCoverWallProps) {
	return (
		<div {...stylex.attrs(styles.root)}>
			<ReleaseCoverWall releases={props.releases} />
		</div>
	)
}

const meta = {
	title: "Component/Display/ReleaseCoverWall",
	component: StoryRoot,
	decorators: [withStoryRouter],
	parameters: {
		layout: StoryLayout.Centered,
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		releases: RELEASES,
	},
}
