import * as M from "@modular-forms/solid"

import { InputField } from "~/component/atomic/form/Input"

import { useArtistForm } from "../context"

export function ArtistFormNameField() {
	const { formStore } = useArtistForm()

	return (
		<M.Field
			name="data.name"
			of={formStore}
		>
			{(field, fieldProps) => (
				<InputField.Root class="w-96">
					<InputField.Label>Name</InputField.Label>
					<InputField.Input
						{...fieldProps}
						type="text"
						id="name"
						value={field.value}
					/>
					<InputField.Error>{field.error}</InputField.Error>
				</InputField.Root>
			)}
		</M.Field>
	)
}
