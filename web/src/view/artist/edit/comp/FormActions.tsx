import { Field } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { ArtistMutation } from "@thc/query"
import { For } from "solid-js"

import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"

import { useArtistForm } from "../context"

type ArtistFormFormActionsProps = {
	mutation: ReturnType<typeof ArtistMutation.getInstance>
}

export function ArtistFormActions(props: ArtistFormFormActionsProps) {
	const { t } = useLingui()
	const { formStore } = useArtistForm()

	return (
		<>
			<Field
				of={formStore}
				path={["description"]}
			>
				{(field) => (
					<InputField.Root>
						<InputField.Label>{t`Description`}</InputField.Label>
						<InputField.Textarea
							{...field.props}
							id={field.path.join(".")}
							value={field.input ?? ""}
						/>
						<InputField.Error>{field.errors?.[0]}</InputField.Error>
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
							hidden
							id={field.path.join(".")}
							value={field.input ?? ""}
						/>
						<InputField.Error>{field.errors?.[0]}</InputField.Error>
					</InputField.Root>
				)}
			</Field>

			<div class="flex flex-col">
				<For each={formStore.errors ?? []}>
					{(error) => <FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>}
				</For>

				<FormComp.ErrorMessage class="text-lg">
					{props.mutation.isError
						? `Error: ${props.mutation.error.message}`
						: undefined}
				</FormComp.ErrorMessage>
			</div>
		</>
	)
}
