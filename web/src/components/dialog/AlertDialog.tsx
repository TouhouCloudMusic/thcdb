import { type JSX, Show, splitProps } from "solid-js"

import { Dialog } from "."
import { Button } from "../button"

export interface AlertDialogProps
  extends Exclude<Dialog.RootProps, "children"> {
  title: string
  trigger: JSX.Element
  description: string
  onCancel: () => void
  onConfirm: () => void
  cancelText?: string
  confirmText?: string
  hideCancel?: boolean
  dismissible?: boolean | undefined
}

export function AlertDialog(props: AlertDialogProps) {
  let handleDismiss = (e: Event) => {
    if (props.dismissible === false) {
      e.preventDefault()
    }
  }

  let [_, root_props] = splitProps(props, [
    "title",
    "trigger",
    "description",
    "onCancel",
    "onConfirm",
    "cancelText",
    "hideCancel",
    "dismissible",
    "children",
  ])
  return (
    <Dialog.Root {...root_props}>
      {props.trigger}
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content
          class={`shadow-2 flex h-48 w-96 flex-col place-content-between`}
          onPointerDownOutside={handleDismiss}
          onEscapeKeyDown={handleDismiss}
        >
          <div>
            <Dialog.Title class="text-lg">{props.title}</Dialog.Title>
            <Dialog.Description>{props.description}</Dialog.Description>
          </div>
          <div class="flex justify-end gap-2">
            <Show when={!props.hideCancel}>
              <Dialog.CloseButton
                class="ml-auto"
                variant="Tertiary"
                onClick={props.onCancel}
              >
                {props.cancelText ?? "取消"}
              </Dialog.CloseButton>
            </Show>
            <Button
              variant="Primary"
              color="Reimu"
              onClick={props.onConfirm}
            >
              {props.confirmText ?? "确定"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
