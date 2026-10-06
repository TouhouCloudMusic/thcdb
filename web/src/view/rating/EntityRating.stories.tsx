import * as stylex from "@stylexjs/stylex"
import { createMemo } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import type { Rating } from "~/hey-api"
import { fontSizes, lineHeights, px } from "~/style/tokens.stylex"
import { StoryLayout } from "~/utils/adapter/storybook"
import { withStoryState } from "~/utils/adapter/storybook-state"

import type { EntityRatingState } from "./EntityRating"
import { EntityRating } from "./EntityRating"
import { createMockEntityRating } from "./storybook"

const styles = stylex.create({
	root: {
		display: "grid",
		gridTemplateColumns: "auto minmax(0,1fr)",
		alignItems: "baseline",
		columnGap: px[16],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	content: { display: "flex", flexDirection: "column", gap: px[4] },
})

function StoryRoot(props: {
	otherRatings: Rating[]
	userRating: Rating | null
	state: EntityRatingState["status"] | "empty" | "unrated"
}) {
	const model = createMemo(() =>
		createMockEntityRating({
			otherRatings: props.state === "empty" ? [] : props.otherRatings,
			userRating:
				props.state === "empty" || props.state === "unrated"
					? null
					: props.userRating,
			status:
				props.state === "empty" || props.state === "unrated"
					? "ready"
					: props.state,
		}),
	)

	return (
		<EntityRating.Root
			model={model()}
			styles={styles.root}
		>
			<EntityRating.Label />
			<div {...stylex.attrs(styles.content)}>
				<EntityRating.Summary />
				<EntityRating.Control />
			</div>
		</EntityRating.Root>
	)
}

const meta = {
	title: "View/Rating/EntityRating",
	component: StoryRoot,
	decorators: [withStoryState],
	parameters: { layout: StoryLayout.Padded },
	args: {
		otherRatings: [4, 4.5, 3],
		userRating: 3.5,
		state: "ready",
	},
	argTypes: {
		otherRatings: { control: "object" },
		userRating: {
			control: "select",
			options: [null, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5],
		},
		state: {
			control: "radio",
			options: ["loading", "readonly", "ready", "saving", "empty", "unrated"],
		},
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
