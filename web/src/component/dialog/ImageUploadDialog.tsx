import type { JSX } from "solid-js"

import { Dialog } from "."
import { ImageCropper } from "../form/ImageCropper"
import type { ImageDropProps } from "../form/ImageCropper"

export type ImageUploadDialogProps = {
	title: JSX.Element
	trigger: JSX.Element
	open: boolean
	/** sync the internal state of the dialog component */
	syncOpen: (state: boolean) => void
	onImageSave: ImageDropProps["onSave"]
}

export function ImageUploadDialog(props: ImageUploadDialogProps) {
	return (
		<Dialog.Root
			open={props.open}
			onOpenChange={props.syncOpen}
		>
			{props.trigger}
			<Dialog.Portal>
				<Dialog.Overlay />
				<Dialog.Content class="w-full max-w-md p-6">
					<Dialog.Title class="text-lg font-medium">{props.title}</Dialog.Title>
					<ImageCropper
						croppieOption={{
							viewport: {
								type: "square",
							},
						}}
						onSave={(state) => {
							props.onImageSave(state)
						}}
					/>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
