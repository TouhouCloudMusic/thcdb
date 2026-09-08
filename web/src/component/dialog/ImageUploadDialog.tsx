import * as stylex from "@stylexjs/stylex"
import type { JSX } from "solid-js"

import { fontSizes, px } from "~/style/tokens.stylex"

import { Dialog } from "."
import { ImageCropper } from "../form/ImageCropper"
import type { ImageDropProps } from "../form/ImageCropper"

const styles = stylex.create({
	content: { width: "100%", maxWidth: px[448], padding: px[24] },
	title: { fontSize: fontSizes.lg, lineHeight: "1.75rem", fontWeight: 500 },
})

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
				<Dialog.Content styles={styles.content}>
					<Dialog.Title styles={styles.title}>{props.title}</Dialog.Title>
					<ImageCropper
						croppieOption={{
							viewport: {
								type: "square",
							},
						}}
						onSave={props.onImageSave}
					/>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
