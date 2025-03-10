import { Show, type JSX } from "solid-js"
import { Dialog } from "."
import { Button } from "../button"

export interface AlertDialogProps extends Dialog.RootProps {
  /**
   * Trigger element of the dialog, doesn't need to be wrapped in `Dialog.Trigger`
   */
  trigger: JSX.Element
  title: string
  description: string
  onCancel: () => void
  onConfirm: () => void
  cancelText?: string
  confirmText?: string
  hideCancel?: boolean
}

export function AlertDialog(props: AlertDialogProps) {
  return (
    <Dialog.Layout
      trigger={props.trigger}
      open={props.open!}
      defaultOpen={props.defaultOpen!}
      onOpenChange={props.onOpenChange!}
    >
      <Dialog.Content class="h-48 w-96 flex flex-col place-content-between">
        <div>
          <Dialog.Title class="text-lg">{props.title}</Dialog.Title>
          <Dialog.Description>{props.description}</Dialog.Description>
        </div>
        <div class="flex gap-2">
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
    </Dialog.Layout>
  )
}
