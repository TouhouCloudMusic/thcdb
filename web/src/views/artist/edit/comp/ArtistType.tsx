import { Trans } from "@lingui-solid/solid/macro"
import * as M from "@modular-forms/solid"
import type { ArtistType } from "@thc/api"
import { For } from "solid-js"

import { FormComp } from "~/components/atomic/form"
import type { NewArtistCorrection } from "~/domain/artist/schema"

import { useArtistForm } from "../context"

export function ArtistFormArtistTypeField() {
	const { formStore } = useArtistForm()

	return (
		<M.Field
			name="data.artist_type"
			type="string"
			of={formStore}
		>
			{(field, fieldProps) => (
				<div class="flex flex-col">
					<FormComp.Label for="artist_type">
						<Trans>Artist Type</Trans>
					</FormComp.Label>
					<div class="w-fit rounded-sm border border-slate-300 font-light">
						<select
							{...fieldProps}
							id="artist_type"
							class="box-border h-8 w-full min-w-max rounded px-1 whitespace-nowrap focus:outline-2 focus:outline-reimu-600"
						>
							<option value="">
								<Trans>-- Please select artist type --</Trans>
							</option>
							<For each={["Solo", "Multiple", "Unknown"] as ArtistType[]}>
								{(type) => (
									<option
										value={type}
										selected={field.value == type}
									>
										{type}
									</option>
								)}
							</For>
						</select>
					</div>
				</div>
			)}
		</M.Field>
	)
}
