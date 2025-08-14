import { Trans, useLingui } from "@lingui-solid/solid/macro"
import * as M from "@modular-forms/solid"

import type { ArtistMutation } from "~/api/artist"
import type { NewArtistCorrection } from "~/api/artist/schema"
import { Button } from "~/components/button"
import { FormComp } from "~/components/common/form"
import { InputField } from "~/components/common/form/Input"

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
						<InputField.Error message={field.error} />
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
					{props.mutation.isPending || formStore.submitting ?
						t`Loading`
					:	t`Submit`}
				</Button>

				<FormComp.ErrorMessage message={formStore.response.message} />
				<FormComp.ErrorMessage
					class="text-lg"
					message={
						props.mutation.isError ?
							t`Error: ${props.mutation.error.message}`
						:	undefined
					}
				/>
			</div>
		</>
	)
}
