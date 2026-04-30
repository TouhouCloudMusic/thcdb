import { Field } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import { For } from "solid-js"
import { twMerge } from "tailwind-merge"

import { InputField } from "~/component/atomic/form/Input"

import { useEventForm } from "../context"

type Props = {
	class?: string
}

export function EventNameField(props: Props) {
	const { t } = useLingui()
	const { formStore } = useEventForm()

	return (
		<Field
			of={formStore}
			path={["data", "name"]}
		>
			{(field) => (
				<InputField.Root class={twMerge("flex flex-col", props.class)}>
					<InputField.Label>{t`Name`}</InputField.Label>
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
