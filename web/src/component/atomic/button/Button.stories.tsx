import * as stylex from "@stylexjs/stylex"
import { ArrowRightIcon } from "@thc/icons/radix"
import { For, Show } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { Button } from "~/component/atomic/button"
import type { ButtonProps } from "~/component/atomic/button"
import { palette } from "~/style/color/palette.stylex"
import { px } from "~/style/tokens.stylex"

const appearances = ["solid", "soft", "ghost", "surface", "outline"] as const
const tones = ["gray", "slate", "blue", "reimu", "marisa", "green"] as const

const styles = stylex.create({
	row: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: px[16],
	},
	largerText: { fontSize: px[20] },
	heightContainer: {
		containerType: "size",
		height: px[48],
		width: px[384],
		maxWidth: "100%",
		flexWrap: "nowrap",
		outline: `1px dashed ${palette.slate[300]}`,
	},
	matrix: {
		display: "grid",
		gap: px[16],
	},
})

const meta: Meta<ButtonProps> = {
	component: Button,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	argTypes: {
		appearance: {
			control: "select",
			options: [...appearances],
		},
		tone: {
			control: "select",
			options: [...tones],
		},
		size: { control: "select", options: ["xs", "sm", "md", "lg"] },
		targetHeight: {
			control: "text",
			description:
				"Target outer height as a CSS length or a variable that resolves to a length.",
		},
	},
}

export default meta
type Story = StoryObj<ButtonProps>

export const Default: Story = {
	args: { children: "Button", appearance: "soft", tone: "gray", size: "md" },
}

export const Appearances: Story = {
	args: { size: "sm" },
	render: (args) => (
		<div {...stylex.attrs(styles.matrix)}>
			<For each={appearances}>
				{(appearance) => (
					<section aria-label={appearance}>
						<h2>{appearance}</h2>
						<div {...stylex.attrs(styles.row)}>
							<For each={tones}>
								{(tone) => (
									<Button
										appearance={appearance}
										tone={tone}
										size={args.size}
									>
										{tone}
									</Button>
								)}
							</For>
							<Button
								appearance={appearance}
								size={args.size}
								disabled
							>
								Disabled
							</Button>
						</div>
					</section>
				)}
			</For>
		</div>
	),
}

function LayoutArrow(props: Pick<ButtonProps, "size" | "targetHeight">) {
	return (
		<Show
			when={props.size !== undefined || props.targetHeight !== undefined}
			fallback={<ArrowRightIcon aria-hidden="true" />}
		>
			<Button.Icon>
				<ArrowRightIcon aria-hidden="true" />
			</Button.Icon>
		</Show>
	)
}

export const ContentLayouts: Story = {
	args: { children: "Next", appearance: "outline", tone: "gray", size: "md" },
	render: (args) => (
		<div {...stylex.attrs(styles.row)}>
			<Button {...args} />
			<Button {...args}>
				{args.children}
				<LayoutArrow
					size={args.size}
					targetHeight={args.targetHeight}
				/>
			</Button>
			<Button
				{...args}
				aria-label="Next"
			>
				<LayoutArrow
					size={args.size}
					targetHeight={args.targetHeight}
				/>
			</Button>
		</div>
	),
}

export const TargetHeight: Story = {
	args: { appearance: "outline", size: "md", targetHeight: "36px" },
	render: (args) => (
		<div {...stylex.attrs(styles.row)}>
			<Button {...args}>Next</Button>
			<Button
				{...args}
				styles={[args.styles, styles.largerText]}
			>
				Next
				<Button.Icon>
					<ArrowRightIcon aria-hidden="true" />
				</Button.Icon>
			</Button>
			<Button
				appearance={args.appearance}
				targetHeight="var(--preview-button-height, 2.75rem)"
				aria-label="Next"
			>
				<Button.Icon>
					<ArrowRightIcon aria-hidden="true" />
				</Button.Icon>
			</Button>
		</div>
	),
}

export const ContainerHeight: Story = {
	args: { appearance: "outline", size: "md", targetHeight: "2.75rem" },
	render: (args) => (
		<div {...stylex.attrs(styles.row)}>
			<Button
				appearance={args.appearance}
				size={args.size}
			>
				Preset height
			</Button>
			<div {...stylex.attrs(styles.row, styles.heightContainer)}>
				<Button
					appearance={args.appearance}
					size={args.size}
				>
					Automatic
				</Button>
				<Button appearance={args.appearance}>Unsized</Button>
				<Button {...args}>Override</Button>
			</div>
		</div>
	),
}
