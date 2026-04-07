import { Show, splitProps } from "solid-js"
import type { ComponentProps, JSX } from "solid-js"

import { Dialog } from "."
import { Button } from "../atomic/button"

export type AlertDialogProps = Exclude<Dialog.RootProps, "children"> & {
	title: string
	triggerAs: (props: TriggerAsProps) => JSX.Element
	description: string
	onCancel: () => void
	onConfirm: () => void
	cancelText?: string
	confirmText?: string
	hideCancel?: boolean
	dismissible?: boolean | undefined
}

type TriggerAsProps = Omit<ComponentProps<typeof Button>, "children">

export function AlertDialog(props: AlertDialogProps) {
	const handleDismiss = (e: Event) => {
		if (props.dismissible === false) {
			e.preventDefault()
		}
	}

	const [local, root_props] = splitProps(props, [
		"title",
		"triggerAs",
		"description",
		"onCancel",
		"onConfirm",
		"cancelText",
		"confirmText",
		"hideCancel",
		"dismissible",
	])
	const TriggerRenderer = (triggerProps: Dialog.TriggerRenderProps) =>
		// @ts-expect-error
		local.triggerAs(triggerProps)

	return (
		<Dialog.Root {...root_props}>
			<Dialog.Trigger
				as={TriggerRenderer as ComponentProps<typeof Dialog.Trigger>["as"]}
			/>
			<Dialog.Portal>
				<Dialog.Overlay />
				<Dialog.Content
					class="shadow-2 flex h-48 w-96 flex-col justify-between rounded-md p-6"
					onPointerDownOutside={handleDismiss}
					onEscapeKeyDown={handleDismiss}
				>
					<div>
						<Dialog.Title class="text-lg">{local.title}</Dialog.Title>
						<Dialog.Description>{local.description}</Dialog.Description>
					</div>
					<div class="flex justify-end gap-2">
						<Show when={!local.hideCancel}>
							<Dialog.CloseButton
								class="ml-auto"
								variant="Tertiary"
								size="Sm"
								onClick={local.onCancel}
							>
								{local.cancelText ?? "Cancel"}
							</Dialog.CloseButton>
						</Show>
						<Button
							variant="Primary"
							color="Reimu"
							size="Sm"
							onClick={local.onConfirm}
						>
							{local.confirmText ?? "Confirm"}
						</Button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
