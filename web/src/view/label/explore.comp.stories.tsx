import * as stylex from "@stylexjs/stylex"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { Intersperse } from "~/component/data/Intersperse"
import type { LabelListItem } from "~/hey-api"
import { dividerStyles } from "~/style/primitives"
import { colors, px } from "~/style/tokens.stylex"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { LabelItem } from "./LabelItem"

const styles = stylex.create({
	preview: {
		marginInline: "auto",
		width: "100%",
		backgroundColor: colors.backgroundPrimary,
	},
	narrowPreview: { maxWidth: px[384] },
	fullPreview: { maxWidth: px[768] },
	list: {
		display: "flex",
		flexDirection: "column",
		gap: px[8],
		padding: px[16],
	},
})

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
			{...stylex.attrs(
				styles.preview,
				props.width === "narrow" ? styles.narrowPreview : styles.fullPreview,
			)}
		>
			<div {...stylex.attrs(styles.list)}>
				<Intersperse
					of={props.labels}
					with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
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
