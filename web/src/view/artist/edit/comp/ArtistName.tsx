import { Field } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"

import { InputField } from "~/component/atomic/form/Input"

import { useArtistForm } from "../context"

export function ArtistFormNameField() {
	const { t } = useLingui()
	const { formStore } = useArtistForm()

	return (
		<Field
			of={formStore}
			path={["data", "name"]}
		>
			{(field) => (
				<InputField.Root class="w-96">
					<InputField.Label>{t`Name`}</InputField.Label>
					<InputField.Input
						{...field.props}
						type="text"
						id="name"
						value={field.input ?? ""}
					/>
					<InputField.Error>{field.errors?.[0]}</InputField.Error>
				</InputField.Root>
			)}
		</Field>
	)
}
