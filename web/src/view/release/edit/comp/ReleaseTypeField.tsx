import { Field } from "@formisch/solid"
import { For } from "solid-js"
import { twMerge } from "tailwind-merge"

import { FormComp } from "~/component/atomic/form"
import { Select } from "~/component/atomic/form/select"
import { RELEASE_TYPES } from "~/domain/release"

import type { ReleaseFormStore } from "./types"

function getTypeLabel(value: string) {
	return value === "" ? "-- Please select release type --" : value
}

export function ReleaseTypeField(props: {
	of: ReleaseFormStore
	class?: string
}) {
	const typeOptions = ["", ...RELEASE_TYPES] as const

	return (
		<Field
			of={props.of}
			path={["data", "release_type"]}
		>
			{(field) => (
				<div class={twMerge("flex flex-col", props.class)}>
					<FormComp.Label>Release Type</FormComp.Label>
					<Select.Root<string>
						name={field.props.name}
						value={field.input ?? ""}
						onChange={(value = "") => {
							field.onInput(
								value === ""
									? undefined
									: (value as (typeof RELEASE_TYPES)[number]),
							)
						}}
						options={typeOptions as unknown as string[]}
						itemComponent={(props) => (
							<Select.Item item={props.item}>
								{getTypeLabel(props.item.rawValue)}
							</Select.Item>
						)}
					>
						<Select.HiddenSelect
							onChange={field.props.onChange}
							onInput={field.props.onInput}
							onBlur={field.props.onBlur}
							onFocus={field.props.onFocus}
						/>
						<Select.Trigger class="h-auto min-h-9 rounded border border-slate-400 px-2 py-1 text-lg font-light">
							<Select.Value<string>>
								{(state) => getTypeLabel(state.selectedOption() ?? "")}
							</Select.Value>
							<Select.Icon />
						</Select.Trigger>
						<Select.Portal>
							<Select.Content>
								<Select.Listbox />
							</Select.Content>
						</Select.Portal>
					</Select.Root>
					<For each={field.errors}>
						{(error) => <FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>}
					</For>
				</div>
			)}
		</Field>
	)
}
