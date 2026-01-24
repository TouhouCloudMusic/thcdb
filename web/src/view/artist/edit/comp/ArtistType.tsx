import { Field } from "@formisch/solid"
import type { ArtistType } from "@thc/api"
import { For } from "solid-js"

import { FormComp } from "~/component/atomic/form"

import { useArtistForm } from "../context"

export function ArtistFormArtistTypeField() {
	const { formStore } = useArtistForm()

	return (
		<Field
			of={formStore}
			path={["data", "artist_type"]}
		>
			{(field) => (
				<div class="flex flex-col">
					<FormComp.Label for="artist_type">Artist Type</FormComp.Label>
					<div class="w-fit rounded-sm border border-slate-300 font-light">
						<select
							{...field.props}
							id="artist_type"
							class="box-border h-8 w-full min-w-max rounded px-1 whitespace-nowrap focus:outline-2 focus:outline-reimu-600"
						>
							<option value="">-- Please select artist type --</option>
							<For each={["Solo", "Multiple", "Unknown"] as ArtistType[]}>
								{(type) => (
									<option
										value={type}
										selected={field.input == type}
									>
										{type}
									</option>
								)}
							</For>
						</select>
					</div>
				</div>
			)}
		</Field>
	)
}
