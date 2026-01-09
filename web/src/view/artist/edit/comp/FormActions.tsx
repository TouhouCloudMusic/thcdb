import * as M from "@modular-forms/solid"
import type { ArtistMutation } from "@thc/query"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"

import { useArtistForm } from "../context"

type ArtistFormFormActionsProps = {
	mutation: ReturnType<typeof ArtistMutation.getInstance>
}

export function ArtistFormActions(props: ArtistFormFormActionsProps) {
	const { formStore } = useArtistForm()

	return (
		<>
			<M.Field
				name="description"
				of={formStore}
			>
				{(field, fieldProps) => (
					<InputField.Root>
						<InputField.Label>Description</InputField.Label>
						<InputField.Textarea
							{...fieldProps}
							id={field.name}
						/>
						<InputField.Error>{field.error}</InputField.Error>
					</InputField.Root>
				)}
			</M.Field>

			<M.Field
				name="type"
				of={formStore}
			>
				{(field, fieldProps) => (
					<InputField.Root>
						<InputField.Input
							{...fieldProps}
							hidden
							id={field.name}
							value={field.value}
						/>
						<InputField.Error>{field.error}</InputField.Error>
					</InputField.Root>
				)}
			</M.Field>

			<div class="flex flex-col">
				<Button
					variant="Primary"
					type="submit"
					disabled={props.mutation.isPending || formStore.submitting}
				>
					{props.mutation.isPending || formStore.submitting
						? "Loading"
						: "Submit"}
				</Button>

				<FormComp.ErrorMessage>
					{formStore.response.message}
				</FormComp.ErrorMessage>
				<FormComp.ErrorMessage class="text-lg">
					{props.mutation.isError
						? `Error: ${props.mutation.error.message}`
						: undefined}
				</FormComp.ErrorMessage>
			</div>
		</>
	)
}
