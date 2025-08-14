import { Trans } from "@lingui-solid/solid/macro"
import * as M from "@modular-forms/solid"

import type { NewArtistCorrection } from "~/api/artist/schema"
import { InputField } from "~/components/common/form/Input"

import { useArtistForm } from "../context"

export function ArtistFormNameField() {
	const { formStore } = useArtistForm()

	return (
		<M.Field
			name="data.name"
			of={formStore}
		>
			{(field, fieldProps) => (
				<InputField.Root class="w-96">
					<InputField.Label>
						<Trans>Name</Trans>
					</InputField.Label>
					<InputField.Input
						{...fieldProps}
						type="text"
						id="name"
						value={field.value}
					/>
					<InputField.Error message={field.error} />
				</InputField.Root>
			)}
		</M.Field>
	)
}
