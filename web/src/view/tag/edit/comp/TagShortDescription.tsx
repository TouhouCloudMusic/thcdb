import { Field } from "@formisch/solid"
import { Trans } from "@lingui-solid/solid/macro"
import { For } from "solid-js"
import { twMerge } from "tailwind-merge"

import { InputField } from "~/component/atomic/form/Input"

import { useTagForm } from "../context"

type Props = {
	class?: string
}

export function TagFormShortDescriptionField(props: Props) {
	const { formStore } = useTagForm()

	return (
		<Field
			of={formStore}
			path={["data", "short_description"]}
		>
			{(field) => (
				<InputField.Root class={twMerge("flex flex-col", props.class)}>
					<InputField.Label>
						<Trans>Short Description</Trans>
					</InputField.Label>
					<InputField.Input
						{...field.props}
						value={field.input ?? ""}
						placeholder=""
					/>
					<For each={field.errors}>
						{(error) => <InputField.Error>{error}</InputField.Error>}
					</For>
				</InputField.Root>
			)}
		</Field>
	)
}
