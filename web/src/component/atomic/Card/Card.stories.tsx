import * as stylex from "@stylexjs/stylex"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { surfaceStyles } from "~/style/primitives"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { StoryLayout } from "~/utils/adapter/storybook"
const styles = stylex.create({
	card: { margin: "auto", width: px[384] },
	heading: {
		fontSize: fontSizes["2xl"],
		lineHeight: lineHeights["2xl"],
		fontWeight: 600,
	},
	article: { color: colors.textSecondary },
})

const meta: Meta = {
	title: "Atomic/Card",
	parameters: {
		layout: StoryLayout.Centered,
	},
	tags: ["autodocs"],
	argTypes: {},
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	render: () => (
		<div {...stylex.attrs(surfaceStyles.card, styles.card)}>
			<h1 {...stylex.attrs(styles.heading)}>This is a card</h1>
			<article {...stylex.attrs(styles.article)}>
				Lorem ipsum, dolor sit amet consectetur adipisicing elit. Non eveniet,
				ratione porro voluptates dolor eligendi error consequuntur cum provident
				unde odio recusandae, optio adipisci! Obcaecati, fugit laboriosam. Aut,
				expedita pariatur!
			</article>
		</div>
	),
}
