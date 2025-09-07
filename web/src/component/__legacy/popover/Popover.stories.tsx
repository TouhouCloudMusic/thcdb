import type { Meta, StoryObj } from "storybook-solidjs"

import { Button } from "~/component/atomic/button"

import { Popover } from "."

const meta = {
	component: Popover.Root,
	tags: ["autodocs"],
	argTypes: {
		placement: {
			control: "select",
			options: [
				"top",
				"bottom",
				"left",
				"right",
				"top-start",
				"top-end",
				"bottom-start",
				"bottom-end",
				"left-start",
				"left-end",
				"right-start",
				"right-end",
			],
			description: "弹窗相对于触发器的位置",
			defaultValue: "bottom",
		},
		gutter: {
			control: "number",
			description: "弹窗与触发器/锚点元素之间的距离",
			defaultValue: 0,
		},
		shift: {
			control: "number",
			description: "弹窗沿锚点元素的偏移量",
			defaultValue: 0,
		},
		flip: {
			control: {
				type: "select",
				options: [true, false, "top left", "bottom right"],
			},
			description: "控制弹窗在溢出视口时的行为",
			defaultValue: true,
		},
		slide: {
			control: "boolean",
			description: "弹窗在溢出时是否应该滑动",
			defaultValue: true,
		},
		overlap: {
			control: "boolean",
			description: "弹窗在溢出时是否可以与锚点元素重叠",
			defaultValue: false,
		},
		sameWidth: {
			control: "boolean",
			description: "弹窗是否应该与锚点元素具有相同的宽度",
			defaultValue: false,
		},
		fitViewport: {
			control: "boolean",
			description: "弹窗是否应该适应视口",
			defaultValue: true,
		},
		hideWhenDetached: {
			control: "boolean",
			description: "当锚点元素被遮挡时是否隐藏弹窗",
			defaultValue: true,
		},
		detachedPadding: {
			control: "number",
			description: "考虑锚点元素被遮挡的最小内边距",
			defaultValue: 0,
		},
		arrowPadding: {
			control: "number",
			description: "箭头与弹窗角落之间的最小内边距",
			defaultValue: 0,
		},
		overflowPadding: {
			control: "number",
			description: "弹窗与视口边缘之间的最小内边距",
			defaultValue: 0,
		},
	},
} satisfies Meta<Popover.RootProps>

export default meta
type Story = StoryObj<Popover.RootProps>

export const Default: Story = {
	render: (args) => {
		return (
			<Popover.Root
				{...args}
				defaultOpen
			>
				<Popover.Trigger as={Button}>打开弹窗</Popover.Trigger>
				<Popover.PortalContent>
					<Popover.Arrow />
					<Popover.Title>弹窗标题</Popover.Title>
					<Popover.Description>这是弹窗内容的描述。</Popover.Description>
					<Popover.CloseButton>关闭</Popover.CloseButton>
				</Popover.PortalContent>
			</Popover.Root>
		)
	},
}

export const CustomContent: Story = {
	render: (args) => {
		return (
			<Popover.Root {...args}>
				<Popover.Trigger as={Button}>打开自定义内容</Popover.Trigger>
				<Popover.PortalContent>
					<Popover.Arrow />
					<Popover.Title>弹窗标题</Popover.Title>
					<div class="mt-2 space-y-2">
						<Popover.Description>这是一个自定义内容布局。</Popover.Description>
						<div class="flex gap-2">
							<Button variant="Secondary">操作 1</Button>
							<Button variant="Secondary">操作 2</Button>
						</div>
					</div>
					<Popover.CloseButton class="mt-4">关闭</Popover.CloseButton>
				</Popover.PortalContent>
			</Popover.Root>
		)
	},
}
