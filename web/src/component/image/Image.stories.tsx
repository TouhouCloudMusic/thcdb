import * as stylex from "@stylexjs/stylex"
// Image.stories.ts
import { createEffect, createSignal } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { palette } from "~/style/color/palette.stylex"
import { lineHeights, fontSizes } from "~/style/tokens.stylex"

import { Image } from "."

// 定义 Storybook 的 Meta 配置
const styles = stylex.create({
	fallback: {
		display: "flex",
		height: "300px",
		width: "300px",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: palette.slate[100],
	},
	label: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
	},
})

const meta: Meta<typeof Image.Root> = {
	title: "Image",
	component: Image.Root,
	tags: ["autodocs"],
}

type Story = StoryObj<typeof Image.Root>

// 基本用法
export const Default: Story = {
	name: "Default Image",
	render: (args) => (
		<Image.Root {...args}>
			<Image.Img
				loading="lazy"
				width={300}
				height={300}
				src="https://th.bing.com/th/id/OIP.1JqzUmtCX3Ng-8i-n5_kHgAAAA?w=120&h=104&c=7&bgcl=de1aa5&r=0&o=6&dpr=1.5&pid=13.1"
			/>
			<Image.Fallback>
				{(state) => (
					<div {...stylex.attrs(styles.fallback)}>
						<span {...stylex.attrs(styles.label)}>
							{state === Image.State.Loading ? "Loading..." : "No Image"}
						</span>
					</div>
				)}
			</Image.Fallback>
		</Image.Root>
	),
	args: {},
}

// 加载失败
export const ErrorState: Story = {
	name: "Error State",
	render: (args) => (
		<Image.Root {...args}>
			<Image.Img
				loading="lazy"
				width={300}
				height={300}
				src=""
			/>
			<Image.Fallback>
				{(state) => (
					<div {...stylex.attrs(styles.fallback)}>
						<span {...stylex.attrs(styles.label)}>
							{state === Image.State.Loading ? "Loading..." : "No Image"}
						</span>
					</div>
				)}
			</Image.Fallback>
		</Image.Root>
	),
}

// 启用预览功能
export const WithPreview: Story = {
	name: "With Preview",
	render: (args) => {
		const [open, setOpen] = createSignal(false)
		createEffect(() => {
			console.log(open())
		})
		return (
			<Image.Root {...args}>
				<Image.Img
					loading="lazy"
					width={300}
					height={300}
					onClick={() => setOpen(true)}
					src="https://th.bing.com/th/id/OIP.1JqzUmtCX3Ng-8i-n5_kHgAAAA?w=120&h=104&c=7&bgcl=de1aa5&r=0&o=6&dpr=1.5&pid=13.1"
				/>
				<Image.Fallback>
					{(state) => (
						<div {...stylex.attrs(styles.fallback)}>
							<span {...stylex.attrs(styles.label)}>
								{state === Image.State.Loading ? "Loading..." : "No Image"}
							</span>
						</div>
					)}
				</Image.Fallback>
				<Image.Preview
					open={open()}
					close={() => setOpen(false)}
				/>
			</Image.Root>
		)
	},
}

export default meta
