import { Field } from "@formisch/solid"
import { Trans, useLingui } from "@lingui-solid/solid/macro"
import type { TagMutation } from "@thc/query"
import { For } from "solid-js"
import { twMerge } from "tailwind-merge"

import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"

import { useTagForm } from "../context"

type Props = {
	mutation: ReturnType<typeof TagMutation.getInstance>
	class?: string
}

export function TagFormDesc(props: Props) {
	const { formStore } = useTagForm()
	const { t } = useLingui()

	return (
		<div class={twMerge("flex flex-col gap-4", props.class)}>
			<Field
				of={formStore}
				path={["description"]}
			>
				{(field) => (
					<InputField.Root>
						<InputField.Label>
							<Trans>Correction Description</Trans>
						</InputField.Label>
						<InputField.Textarea
							{...field.props}
							value={field.input ?? ""}
							class="min-h-32"
						/>

						<For each={field.errors}>
							{(error) => <InputField.Error>{error}</InputField.Error>}
						</For>
					</InputField.Root>
				)}
			</Field>

			<Field
				of={formStore}
				path={["type"]}
			>
				{(field) => (
					<InputField.Root>
						<InputField.Input
							{...field.props}
							type="hidden"
							value={field.input}
						/>
						<For each={field.errors}>
							{(error) => <InputField.Error>{error}</InputField.Error>}
						</For>
					</InputField.Root>
				)}
			</Field>

			<div class="flex flex-col">
				<FormComp.ErrorMessage class="text-lg">
					{props.mutation.isError
						? t`Error: ${props.mutation.error.message}`
						: undefined}
				</FormComp.ErrorMessage>
			</div>
		</div>
	)
}
