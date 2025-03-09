import { type Meta, type StoryObj } from "storybook-solidjs"
import { AlertDialog } from "./AlertDialog"
import { createSignal } from "solid-js"
import { Button } from "@suid/material"

const meta = {
  title: "组件/对话框/AlertDialog",
  component: AlertDialog,
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text", description: "对话框标题" },
    content: { control: "text", description: "对话框内容" },
    confirmText: { control: "text", description: "确认按钮文本" },
    cancelText: { control: "text", description: "取消按钮文本" },
    onConfirm: { action: "confirmed", description: "确认按钮点击回调" },
    onCancel: { action: "canceled", description: "取消按钮点击回调" },
    onClose: { action: "closed", description: "关闭对话框回调" },
  },
} satisfies Meta<typeof AlertDialog>

export default meta
type Story = StoryObj<typeof AlertDialog>

// 基础对话框示例
export const Default: Story = {
  render: (args) => {
    const [open, setOpen] = createSignal(false)

    return (
      <>
        <Button onClick={() => setOpen(true)}>打开对话框</Button>
        <AlertDialog
          {...args}
          open={open()}
          onClose={() => setOpen(false)}
        />
      </>
    )
  },
  args: {
    title: "提示",
    content: "这是一个基础的提示对话框示例",
    confirmText: "确定",
    cancelText: "取消",
  },
}

// 删除确认对话框示例
export const DeleteConfirmation: Story = {
  render: (args) => {
    const [open, setOpen] = createSignal(false)
    const handleDelete = () => {
      console.log("执行删除操作")
      setTimeout(() => setOpen(false), 500)
    }

    return (
      <>
        <Button
          color="error"
          onClick={() => setOpen(true)}
        >
          删除项目
        </Button>
        <AlertDialog
          {...args}
          open={open()}
          onClose={() => setOpen(false)}
          onConfirm={handleDelete}
        />
      </>
    )
  },
  args: {
    title: "确认删除",
    content: "您确定要删除此项目吗？此操作无法撤销。",
    confirmText: "删除",
    cancelText: "取消",
  },
}

// 自定义按钮文本的对话框
export const CustomButtonText: Story = {
  render: (args) => {
    const [open, setOpen] = createSignal(false)

    return (
      <>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => setOpen(true)}
        >
          自定义按钮文本
        </Button>
        <AlertDialog
          {...args}
          open={open()}
          onClose={() => setOpen(false)}
        />
      </>
    )
  },
  args: {
    title: "版本更新",
    content: "发现新版本，是否立即更新？",
    confirmText: "立即更新",
    cancelText: "稍后再说",
  },
}

// 没有取消按钮的对话框
export const NoCancel: Story = {
  render: (args) => {
    const [open, setOpen] = createSignal(false)

    return (
      <>
        <Button
          variant="contained"
          onClick={() => setOpen(true)}
        >
          只有确认按钮
        </Button>
        <AlertDialog
          {...args}
          open={open()}
          onClose={() => setOpen(false)}
        />
      </>
    )
  },
  args: {
    title: "系统通知",
    content: "您的操作已成功完成！",
    confirmText: "我知道了",
    cancelText: "", // 空字符串将隐藏取消按钮
  },
}
