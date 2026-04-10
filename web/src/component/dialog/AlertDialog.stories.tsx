import { createSignal } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { Button } from "../atomic/button"
import { AlertDialog } from "./AlertDialog"

const meta = {
	component: AlertDialog,
	tags: ["autodocs"],
	argTypes: {
		title: { control: "text", description: "对话框标题" },
		description: { control: "text", description: "对话框内容" },
		confirmText: { control: "text", description: "确认按钮文本" },
		cancelText: { control: "text", description: "取消按钮文本" },
		dismissible: {
			control: "boolean",
			description: "是否可通过点击外部或按下Esc键关闭",
		},
		onConfirm: { action: "confirmed", description: "确认按钮点击回调" },
		onCancel: { action: "closed", description: "关闭对话框回调" },
	},
} satisfies Meta<typeof AlertDialog>

export default meta
type Story = StoryObj<typeof AlertDialog>

// 基础对话框示例
export const Default: Story = {
	render: (args) => {
		const [open, setOpen] = createSignal(false)
		const close = () => {
			setOpen(false)
		}
		return (
			<>
				<AlertDialog
					{...args}
					open={open()}
					onOpenChange={setOpen}
					triggerAs={(triggerProps) => (
						<Button
							{...triggerProps}
							variant="Tertiary"
						>
							打开对话框
						</Button>
					)}
					onConfirm={close}
				/>
			</>
		)
	},
	args: {
		title: "提示",
		description: "这是一个基础的提示对话框示例",
		confirmText: "确定",
		cancelText: "取消",
	},
}

// 删除确认对话框示例
export const DeleteConfirmation: Story = {
	render: (args) => {
		const [open, setOpen] = createSignal(false)
		const handleDelete = () => {
			alert("执行删除操作")

			setTimeout(() => setOpen(false), 500)
		}

		return (
			<>
				<AlertDialog
					{...args}
					open={open()}
					onOpenChange={setOpen}
					triggerAs={(triggerProps) => (
						<Button
							{...triggerProps}
							variant="Primary"
							color="Reimu"
						>
							删除项目
						</Button>
					)}
					onConfirm={() => handleDelete()}
				/>
			</>
		)
	},
	args: {
		title: "确认删除",
		description: "您确定要删除此项目吗？此操作无法撤销。",
		confirmText: "删除",
		cancelText: "取消",
	},
}

// 自定义按钮文本的对话框
export const CustomButtonText: Story = {
	render: (args) => {
		return (
			<>
				<AlertDialog
					{...args}
					triggerAs={(triggerProps) => (
						<Button {...triggerProps}>自定义按钮文本</Button>
					)}
					defaultOpen={false}
				/>
			</>
		)
	},
	args: {
		title: "版本更新",
		description: "发现新版本，是否立即更新？",
		confirmText: "立即更新",
		cancelText: "稍后再说",
	},
}

// 没有取消按钮的对话框
export const NoCancel: Story = {
	render: (args) => {
		return (
			<>
				<AlertDialog
					{...args}
					triggerAs={(triggerProps) => (
						<Button
							{...triggerProps}
							variant="Primary"
						>
							只有确认按钮
						</Button>
					)}
				/>
			</>
		)
	},
	args: {
		title: "系统通知",
		description: "您的操作已成功完成！",
		confirmText: "我知道了",
		hideCancel: true,
	},
}

// 不可关闭的对话框示例
export const NonDismissable: Story = {
	render: (args) => {
		return (
			<>
				<AlertDialog
					{...args}
					dismissible={false}
					triggerAs={(triggerProps) => (
						<Button
							{...triggerProps}
							variant="Primary"
						>
							不可撤销的对话框
						</Button>
					)}
				/>
			</>
		)
	},
	args: {
		title: "重要通知",
		description: "此对话框无法通过点击外部或按下Esc键关闭。",
		confirmText: "确认",
		cancelText: "取消",
	},
}

// 新的背景模糊示例
export const BackdropBlurExample: Story = {
	render: (args) => {
		const [open, setOpen] = createSignal(false)
		return (
			<>
				<AlertDialog
					{...args}
					open={open()}
					onOpenChange={setOpen}
					triggerAs={(triggerProps) => (
						<Button
							{...triggerProps}
							variant="Primary"
						>
							背景模糊对话框
						</Button>
					)}
				/>
			</>
		)
	},
	args: {
		title: "背景模糊示例",
		description: "此对话框展示了背景模糊效果。",
		confirmText: "确认",
		cancelText: "取消",
	},
}
