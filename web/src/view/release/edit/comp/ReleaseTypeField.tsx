import { Field } from "@formisch/solid"
import { For } from "solid-js"
import { twMerge } from "tailwind-merge"

import { FormComp } from "~/component/atomic/form"
import { RELEASE_TYPES } from "~/domain/release"

import type { ReleaseFormStore } from "./types"

export function ReleaseTypeField(props: {
	of: ReleaseFormStore
	class?: string
}) {
	return (
		<Field
			of={props.of}
			path={["data", "release_type"]}
		>
			{(field) => (
				<div class={twMerge("flex flex-col", props.class)}>
					<FormComp.Label>Release Type</FormComp.Label>
					<select
						{...field.props}
						class="rounded border border-slate-400 px-2 py-1 text-lg font-light"
						value={field.input}
					>
						<option
							value=""
							disabled
						>
							-- Please select release type --
						</option>
						<For each={RELEASE_TYPES}>
							{(rt) => <option value={rt}>{rt}</option>}
						</For>
					</select>
					<For each={field.errors}>
						{(error) => <FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>}
					</For>
				</div>
			)}
		</Field>
	)
}
