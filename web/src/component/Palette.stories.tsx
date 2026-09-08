import * as stylex from "@stylexjs/stylex"
import { For } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { palette } from "~/style/color/palette.stylex"
import { lineHeights, fontSizes, px, radius } from "~/style/tokens.stylex"

const styles = stylex.create({
	root: { display: "flex", flexDirection: "column", gap: px[32] },
	palette: {
		display: "grid",
		width: "fit-content",
		gridTemplateColumns: "1fr auto",
	},
	name: { marginRight: px[8], display: "flex" },
	swatches: { display: "flex" },
	swatch: {
		margin: px[4],
		width: px[40],
		height: px[40],
		borderRadius: radius.sm,
	},
	column: { display: "flex", flexDirection: "column" },
	heading: {
		marginBottom: px[4],
		fontSize: fontSizes.xl,
		lineHeight: lineHeights.xl,
		color: palette.slate[900],
	},
	darkColumn: {
		display: "flex",
		flexDirection: "column",
		backgroundColor: palette.slate[900],
	},
	borderGrid: {
		display: "grid",
		width: "fit-content",
		gridTemplateColumns: "repeat(6,minmax(0,1fr))",
		gap: px[8],
	},
	circles: {
		display: "grid",
		gridTemplateColumns: "repeat(2,minmax(0,1fr))",
		gap: px[8],
	},
	circle: {
		margin: "auto",
		display: "flex",
		placeContent: "center",
		borderRadius: radius.full,
	},
	center: {
		margin: "auto",
		borderRadius: radius.full,
		backgroundColor: palette.white,
	},
	border100: {
		width: px[32],
		height: px[32],
		borderRadius: radius.sm,
		borderWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[100],
	},
	border200: {
		width: px[32],
		height: px[32],
		borderRadius: radius.sm,
		borderWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[200],
	},
	border300: {
		width: px[32],
		height: px[32],
		borderRadius: radius.sm,
		borderWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[300],
	},
	border400: {
		width: px[32],
		height: px[32],
		borderRadius: radius.sm,
		borderWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[400],
	},
	border500: {
		width: px[32],
		height: px[32],
		borderRadius: radius.sm,
		borderWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[500],
	},
	border600: {
		width: px[32],
		height: px[32],
		borderRadius: radius.sm,
		borderWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[600],
	},
	border100On100: {
		width: px[32],
		height: px[32],
		borderRadius: radius.sm,
		borderWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[100],
		backgroundColor: palette.slate[100],
	},
	border200On100: {
		width: px[32],
		height: px[32],
		borderRadius: radius.sm,
		borderWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[200],
		backgroundColor: palette.slate[100],
	},
	border300On100: {
		width: px[32],
		height: px[32],
		borderRadius: radius.sm,
		borderWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[300],
		backgroundColor: palette.slate[100],
	},
	border400On100: {
		width: px[32],
		height: px[32],
		borderRadius: radius.sm,
		borderWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[400],
		backgroundColor: palette.slate[100],
	},
	border500On100: {
		width: px[32],
		height: px[32],
		borderRadius: radius.sm,
		borderWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[500],
		backgroundColor: palette.slate[100],
	},
	border600On100: {
		width: px[32],
		height: px[32],
		borderRadius: radius.sm,
		borderWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[600],
		backgroundColor: palette.slate[100],
	},
	border100On200: {
		width: px[32],
		height: px[32],
		borderRadius: radius.sm,
		borderWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[100],
		backgroundColor: palette.slate[200],
	},
	border200On200: {
		width: px[32],
		height: px[32],
		borderRadius: radius.sm,
		borderWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[200],
		backgroundColor: palette.slate[200],
	},
	border300On200: {
		width: px[32],
		height: px[32],
		borderRadius: radius.sm,
		borderWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[300],
		backgroundColor: palette.slate[200],
	},
	border400On200: {
		width: px[32],
		height: px[32],
		borderRadius: radius.sm,
		borderWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[400],
		backgroundColor: palette.slate[200],
	},
	border500On200: {
		width: px[32],
		height: px[32],
		borderRadius: radius.sm,
		borderWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[500],
		backgroundColor: palette.slate[200],
	},
	border600On200: {
		width: px[32],
		height: px[32],
		borderRadius: radius.sm,
		borderWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[600],
		backgroundColor: palette.slate[200],
	},
})

type Color = {
	name: string
	colors: string[]
}

const colors: Color[] = [
	{
		name: "slate",
		colors: [
			"#f3f4f5",
			"#e8eaed",
			"#d5d7db",
			"#c0c3c8",
			"#a0a4ab",
			"#7c8088",
			"#595c64",
			"#3a3d44",
			"#1b1e25",
		],
	},
	{
		name: "reimu",
		colors: [
			"#fff0ef",
			"#fce1df",
			"#ffcac6",
			"#ff9e99",
			"#f87572",
			"#db464c",
			"#a82f33",
			"#6f1c1b",
			"#3d0c07",
		],
	},
	{
		name: "blue",
		colors: [
			"#edf4ff",
			"#deeaff",
			"#c4d9fd",
			"#96baff",
			"#719cfb",
			"#4e76e2",
			"#2755c7",
			"#06328c",
			"#011446",
		],
	},
	{
		name: "marisa",
		colors: [
			"#fbf3d1",
			"#f7eab8",
			"#edd698",
			"#d9b468",
			"#c79c49",
			"#a57911",
			"#845d11",
			"#553a07",
			"#261803",
		],
	},
	{
		name: "green",
		colors: [
			"#dcfce6",
			"#c0f6d2",
			"#92eaad",
			"#62cf7d",
			"#2fb459",
			"#00903a",
			"#006b28",
			"#004616",
			"#002206",
		],
	},
]

function Palette() {
	return (
		<div {...stylex.attrs(styles.root)}>
			<div {...stylex.attrs(styles.palette)}>
				<For each={colors}>
					{(color) => (
						<>
							<div {...stylex.attrs(styles.name)}>{color.name}</div>
							<ul {...stylex.attrs(styles.swatches)}>
								<For each={color.colors}>
									{(hex) => (
										<li
											{...stylex.attrs(styles.swatch)}
											style={{
												"background-color": hex,
											}}
										></li>
									)}
								</For>
							</ul>
						</>
					)}
				</For>
			</div>
			<div {...stylex.attrs(styles.column)}>
				<h1 {...stylex.attrs(styles.heading)}>Text comparison</h1>
				<div {...stylex.attrs(styles.column)}>
					<For
						each={colors.find((c) => c.name === "Slate")?.colors.toReversed()}
					>
						{(color) => <span style={{ color }}>Text is {color}</span>}
					</For>
				</div>
				<div {...stylex.attrs(styles.darkColumn)}>
					<For each={colors.find((c) => c.name === "Slate")?.colors}>
						{(color) => <span style={{ color }}>Text is {color}</span>}
					</For>
				</div>
			</div>

			<div>
				<h1 {...stylex.attrs(styles.heading)}>Border</h1>
				<div {...stylex.attrs(styles.borderGrid)}>
					<div {...stylex.attrs(styles.border100)}></div>
					<div {...stylex.attrs(styles.border200)}></div>
					<div {...stylex.attrs(styles.border300)}></div>
					<div {...stylex.attrs(styles.border400)}></div>
					<div {...stylex.attrs(styles.border500)}></div>
					<div {...stylex.attrs(styles.border600)}></div>
					<div {...stylex.attrs(styles.border100On100)}></div>
					<div {...stylex.attrs(styles.border200On100)}></div>
					<div {...stylex.attrs(styles.border300On100)}></div>
					<div {...stylex.attrs(styles.border400On100)}></div>
					<div {...stylex.attrs(styles.border500On100)}></div>
					<div {...stylex.attrs(styles.border600On100)}></div>
					<div {...stylex.attrs(styles.border100On200)}></div>
					<div {...stylex.attrs(styles.border200On200)}></div>
					<div {...stylex.attrs(styles.border300On200)}></div>
					<div {...stylex.attrs(styles.border400On200)}></div>
					<div {...stylex.attrs(styles.border500On200)}></div>
					<div {...stylex.attrs(styles.border600On200)}></div>
				</div>
			</div>

			<div {...stylex.attrs(styles.circles)}>
				<For each={colors}>
					{(colorPalette) => {
						const colorStack = colorPalette.colors.slice(0, 5)
						const nested = colorStack.reduce(
							(child, color, idx) => {
								const diameter = `${(16 + idx * 8) * 4}px`
								return (
									<div
										{...stylex.attrs(styles.circle)}
										style={{
											width: diameter,
											height: diameter,
											"background-color": color,
										}}
									>
										{child}
									</div>
								)
							},
							<div
								{...stylex.attrs(styles.center)}
								style={{ width: "32px", height: "32px" }}
							></div>,
						)
						return <>{nested}</>
					}}
				</For>
			</div>
		</div>
	)
}

const meta = {
	title: "Palette",
	component: Palette,
} satisfies Meta<typeof Palette>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
