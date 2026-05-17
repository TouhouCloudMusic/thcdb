import { Field } from "@formisch/solid"
import { Trans, useLingui } from "@lingui/solid/macro"
import { For } from "solid-js"
import { twMerge } from "tailwind-merge"

import { FormComp } from "~/component/atomic/form"
import { Select } from "~/component/atomic/form/select"
import { RELEASE_TYPES } from "~/domain/release"

import type { ReleaseFormStore } from "./types"

export function ReleaseTypeField(props: {
	of: ReleaseFormStore
	class?: string
}) {
	const { t } = useLingui()
	const typeOptions = ["", ...RELEASE_TYPES] as ["", ...typeof RELEASE_TYPES]

	return (
		<Field
			of={props.of}
			path={["data", "release_type"]}
		>
			{(field) => (
				<div class={twMerge("flex flex-col", props.class)}>
					<FormComp.Label>
						<Trans>Release Type</Trans>
					</FormComp.Label>
					<Select.Root<(typeof typeOptions)[number]>
						name={field.props.name}
						value={field.input ?? ""}
						onChange={(value) => {
							field.onInput(value || undefined)
						}}
						options={typeOptions}
						itemComponent={(itemProps) => (
							<Select.Item item={itemProps.item}>
								{itemProps.item.rawValue === ""
									? t`-- Please select release type --`
									: itemProps.item.rawValue}
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
								{(state) => {
									const selectedOption = state.selectedOption()
									return selectedOption === ""
										? t`-- Please select release type --`
										: selectedOption
								}}
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
