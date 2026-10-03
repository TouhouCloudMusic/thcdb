import * as stylex from "@stylexjs/stylex"
import { For } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { colors, fontSizes, lineHeights, px } from "~/style/tokens.stylex"
import * as typography from "~/style/typography"

const styles = stylex.create({
	root: {
		maxWidth: px[1024],
		marginInline: "auto",
		padding: { default: px[16], "@media (min-width: 40rem)": px[32] },
		display: "flex",
		flexDirection: "column",
		gap: px[40],
		color: colors.textPrimary,
		backgroundColor: colors.backgroundPrimary,
	},
	section: { display: "flex", flexDirection: "column", gap: px[16] },
	sectionTitle: {
		fontSize: fontSizes.base,
		lineHeight: lineHeights.base,
		fontWeight: 500,
	},
	row: {
		display: "grid",
		gridTemplateColumns: {
			default: "minmax(0, 1fr)",
			"@media (min-width: 40rem)": `${px[240]} minmax(0, 1fr)`,
		},
		gap: px[16],
		alignItems: "baseline",
		paddingBlock: px[16],
		overflowWrap: "break-word",
	},
	label: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	sample: { minWidth: 0, overflowWrap: "break-word" },
})

const buttonTextStyles = stylex.create({
	lg: {
		fontSize: fontSizes.xl,
		lineHeight: lineHeights.xl,
		fontWeight: 500,
	},
	md: {
		fontSize: fontSizes.base,
		lineHeight: lineHeights.base,
		fontWeight: 500,
	},
	sm: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
	},
	xs: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
	},
})

const HEADINGS = [
	{ size: "xl", fontSize: 32 },
	{ size: "lg", fontSize: 28 },
	{ size: "md", fontSize: 24 },
	{ size: "sm", fontSize: 20 },
] as const

const BUTTONS = [
	{ size: "lg", fontSize: 20 },
	{ size: "md", fontSize: 16 },
	{ size: "sm", fontSize: 14 },
	{ size: "xs", fontSize: 12 },
] as const

function TypographySpecimen(props: { sampleText: string }) {
	return (
		<main {...stylex.attrs(styles.root)}>
			<section {...stylex.attrs(styles.section)}>
				<h2 {...stylex.attrs(styles.sectionTitle)}>Heading</h2>
				<dl>
					<For each={HEADINGS}>
						{(heading) => (
							<div {...stylex.attrs(styles.row)}>
								<dt {...stylex.attrs(styles.label)}>{heading.fontSize}</dt>
								<dd
									{...stylex.attrs(
										typography.heading[heading.size],
										styles.sample,
									)}
								>
									{props.sampleText}
								</dd>
							</div>
						)}
					</For>
				</dl>
			</section>
			<section {...stylex.attrs(styles.section)}>
				<h2 {...stylex.attrs(styles.sectionTitle)}>Button</h2>
				<dl>
					<For each={BUTTONS}>
						{(button) => (
							<div {...stylex.attrs(styles.row)}>
								<dt {...stylex.attrs(styles.label)}>{button.fontSize}</dt>
								<dd
									{...stylex.attrs(
										buttonTextStyles[button.size],
										styles.sample,
									)}
								>
									{props.sampleText}
								</dd>
							</div>
						)}
					</For>
				</dl>
			</section>
		</main>
	)
}

const meta = {
	title: "Design System/Typography",
	component: TypographySpecimen,
	parameters: { layout: "fullscreen" },
	argTypes: { sampleText: { control: "text" } },
} satisfies Meta<typeof TypographySpecimen>

export default meta

type Story = StoryObj<typeof meta>

export const Overview: Story = {
	args: { sampleText: "东方红魔乡 · Scarlet Devil" },
}
