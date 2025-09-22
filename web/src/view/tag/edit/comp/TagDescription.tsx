import { Field } from "@formisch/solid"
import { Trans } from "@lingui-solid/solid/macro"
import { twMerge } from "tailwind-merge"

import { InputField } from "~/component/atomic/form/Input"

import { useTagForm } from "../context"

type Props = {
	class?: string
}

export function TagFormDescriptionField(props: Props) {
	const { formStore } = useTagForm()

	return (
		<Field
			of={formStore}
			path={["data", "description"]}
		>
			{(field) => (
				<InputField.Root class={twMerge("flex flex-col", props.class)}>
					<InputField.Label>
						<Trans>Description</Trans>
					</InputField.Label>
					<InputField.Textarea
						{...field.props}
						value={field.input ?? ""}
					/>
					<InputField.Error>
						{field.errors ? field.errors[0] : undefined}
					</InputField.Error>
				</InputField.Root>
			)}
		</Field>
	)
}
