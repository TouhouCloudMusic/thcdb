import { Field } from "@modular-forms/solid"
import { TextField } from "~/components/form/index.tsx"

import { useController } from "../context.tsx"

export function Name() {
  const { formStore, initData, t, dataQuery } = useController()

  return (
    <Field
      of={formStore}
      name="name"
    >
      {(field, props) => (
        <TextField
          validationState={field.error.length > 0 ? "invalid" : "valid"}
        >
          <TextField.Label for="name">{t.name()}</TextField.Label>
          <TextField.Input
            {...props}
            required
            type="text"
            class={"mt-2"}
            placeholder={t.enter_artist_name()}
            value={initData()?.name ?? (!dataQuery ? "" : "Loading...")}
          />
          <TextField.ErrorMessage>{field.error}</TextField.ErrorMessage>
        </TextField>
      )}
    </Field>
  )
}
