import { Trans, useLingui } from "@lingui-solid/solid/macro"
import * as M from "@modular-forms/solid"
import type { ArtistMutation } from "@thc/query"

import { Button } from "~/components/atomic/button"
import { FormComp } from "~/components/atomic/form"
import { InputField } from "~/components/atomic/form/Input"
import type { NewArtistCorrection } from "~/domain/artist/schema"

import { useArtistForm } from "../context"

type ArtistFormFormActionsProps = {
	mutation: ReturnType<typeof ArtistMutation.getInstance>
}

export function ArtistFormActions(props: ArtistFormFormActionsProps) {
	const { formStore } = useArtistForm()
	const { t } = useLingui()

	return (
		<>
			<M.Field
				name="description"
				of={formStore}
			>
				{(field, fieldProps) => (
					<InputField.Root>
						<InputField.Label>
							<Trans>Description</Trans>
						</InputField.Label>
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
						<InputField.Error message={field.error} />
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
						? t`Loading`
						: t`Submit`}
				</Button>

				<FormComp.ErrorMessage message={formStore.response.message} />
				<FormComp.ErrorMessage
					class="text-lg"
					message={
						props.mutation.isError
							? t`Error: ${props.mutation.error.message}`
							: undefined
					}
				/>
			</div>
		</>
	)
}
