import { Field } from "@formisch/solid"
import { Trans } from "@lingui-solid/solid/macro"
import { For } from "solid-js"
import { twMerge } from "tailwind-merge"

import { InputField } from "~/component/atomic/form/Input"

import { useLabelForm } from "../context"

type Props = {
	class?: string
}

export function LabelNameField(props: Props) {
	const { formStore } = useLabelForm()

	return (
		<Field
			of={formStore}
			path={["data", "name"]}
		>
			{(field) => (
				<InputField.Root class={twMerge("flex flex-col", props.class)}>
					<InputField.Label>
						<Trans>Name</Trans>
					</InputField.Label>
					<InputField.Input
						{...field.props}
						value={field.input ?? ""}
					/>
					<For each={field.errors}>
						{(error) => <InputField.Error>{error}</InputField.Error>}
					</For>
				</InputField.Root>
			)}
		</Field>
	)
}
