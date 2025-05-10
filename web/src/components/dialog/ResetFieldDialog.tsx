import { createMemo } from "solid-js"

import { Button } from "../button/index.tsx"
import { ArrowPathIcon } from "../icons/heroicons/24/outline.tsx"
import { AlertDialog } from "./AlertDialog"

export function ResetFieldDialogTrigger(props: {
  modal?: boolean
  fieldName: string
  onReset: () => void
}) {
  const fieldNameWithoutUnderscore = createMemo(() =>
    props.fieldName.replace(/_/g, " "),
  )
  return (
    <AlertDialog
      trigger={
        <Button variant="Tertiary" class="mr-0.5 aspect-square h-full p-1.5"
                aria-label={`Reset ${fieldNameWithoutUnderscore()} field to initial state`}>
          <ArrowPathIcon />
        </Button>
      }
      title="Reset field?"
      description="This cannot be undone."
      onCancel={() => {console.log("Cancel")}}
      onConfirm={props.onReset}
      cancelText="No"
      confirmText="Reset"
    />
  )
}
