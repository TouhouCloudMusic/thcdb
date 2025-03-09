import { createMemo } from "solid-js"
import { Button, SecondaryButton, TertiaryButton } from "../button/index.tsx"
import { ArrowPathIcon } from "../icons/heroicons/24/outline.tsx"
import { Dialog } from "./Dialog/index.ts"

export function ResetFieldDialogTrigger(props: {
  modal?: boolean
  fieldName: string
  onReset: () => void
}) {
  const fieldNameWithoutUnderscore = createMemo(() =>
    props.fieldName.replace(/_/g, " "),
  )
  return (
    <Dialog.Root modal>
      <Dialog.Trigger
        size="Xs"
        class="mr-0.5 aspect-square h-full p-1.5"
        aria-label={`Reset ${fieldNameWithoutUnderscore()} field to initial state`}
        as={TertiaryButton}
      >
        <ArrowPathIcon />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content class="grid size-fit w-96 grid-cols-3 gap-x-2">
          <Dialog.Title class="col-span-full">Reset field?</Dialog.Title>
          <Dialog.Description class="col-span-full">
            This cannot be undone.
          </Dialog.Description>
          <div class="col-span-2 col-start-2 mt-6 grid grid-cols-subgrid">
            <Dialog.CloseButton
              class=""
              color="warning"
              size="Sm"
              onClick={props.onReset}
              as={SecondaryButton}
            >
              Reset
            </Dialog.CloseButton>
            <Dialog.CloseButton
              size="Sm"
              as={Button}
            >
              No
            </Dialog.CloseButton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
