import { createSignal } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs"

import { logImage } from "~/utils/log"

import { Dialog } from "."
import { Button } from "../atomic/button"
import { ImageUploadDialog } from "./ImageUploadDialog"

const meta = {
	component: ImageUploadDialog,
	tags: ["autodocs"],
	argTypes: {
		title: { control: "text", description: "The display title of the dialog" },
		open: {
			control: "boolean",
			description: "The open state of the dialog",
		},

		onImageSave: {
			action: "image saved",
			description: "The callback when the image is saved",
		},
	},
} satisfies Meta<typeof ImageUploadDialog>

export default meta
type Story = StoryObj<typeof ImageUploadDialog>

export const Default: Story = {
	render: (args) => {
		const [open, setOpen] = createSignal(false)

		return (
			<ImageUploadDialog
				{...args}
				trigger={<Dialog.Trigger as={Button}>Upload Image</Dialog.Trigger>}
				open={open()}
				syncOpen={setOpen}
				onImageSave={(base64) => {
					logImage(base64)
				}}
			/>
		)
	},
	args: {
		title: "Upload Avatar",
	},
}

export const CustomTitle: Story = {
	render: (args) => {
		const [open, setOpen] = createSignal(false)
		return (
			<ImageUploadDialog
				{...args}
				open={open()}
				syncOpen={setOpen}
				trigger={
					<Dialog.Trigger as={Button}>Upload Banner Image</Dialog.Trigger>
				}
			/>
		)
	},
	args: {
		title: "Upload Banner Image",
	},
}
