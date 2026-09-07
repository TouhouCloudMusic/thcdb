import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { splitProps } from "solid-js"
import type { JSX } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { palette } from "~/style/color/palette.stylex"
import { px } from "~/style/tokens.stylex"
import { StoryLayout } from "~/utils/adapter/storybook"

import { inputStyles } from "."

const styles = stylex.create({
	filled: { backgroundColor: palette.slate[100], borderStyle: "none" },
	underline: {
		height: px[32],
		borderTopLeftRadius: px[2],
		borderTopRightRadius: px[2],
		borderBottomWidth: 1,
		borderColor: {
			default: palette.slate[400],
			":hover": { default: null, "@media (hover: hover)": palette.reimu[600] },
			":focus": palette.reimu[600],
		},
		paddingLeft: px[6],
		transitionProperty: "all",
		transitionDuration: "200ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		outlineStyle: "none",
		backgroundColor: { default: null, ":focus": palette.slate[100] },
	},
})
type InputProps = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "class"> & {
	styles?: StyleXStyles
}

function renderInput(args: InputProps) {
	const [local, rest] = splitProps(args, ["styles"])
	return (
		<input
			{...rest}
			{...stylex.attrs(inputStyles.like, inputStyles.input, local.styles)}
		/>
	)
}

const meta: Meta<InputProps> = {
	render: renderInput,
	parameters: {
		layout: StoryLayout.Centered,
	},
	tags: ["autodocs"],
	args: {
		placeholder: "Enter some text ……",
	},
	argTypes: {},
}

export default meta
type Story = StoryObj<InputProps>

export const Default: Story = {
	args: {},
}
export const A: Story = {
	args: {
		styles: styles.filled,
	},
}

export const B: Story = {
	render: (args) => {
		const [local, rest] = splitProps(args, ["styles"])
		return (
			<input
				{...rest}
				{...stylex.attrs(styles.underline, local.styles)}
			/>
		)
	},
	args: {},
}
