import { Field } from "@formisch/solid"
import { Trans, useLingui } from "@lingui/solid/macro"
import type { TagType } from "@thc/api"
import { For } from "solid-js"
import { twMerge } from "tailwind-merge"

import { FormComp, Select } from "~/component/atomic"

import { useTagForm } from "../context"

const TAG_TYPES: TagType[] = ["Descriptor", "Genre", "Movement", "Scene"]

const TAG_TYPE_VALUE_OPTIONS: ("" | TagType)[] = ["", ...TAG_TYPES]

type Props = {
	class?: string
}

export function TagFormTypeField(props: Props) {
	const { t } = useLingui()
	const { formStore } = useTagForm()

	return (
		<Field
			of={formStore}
			path={["data", "type"]}
		>
			{(field) => (
				<div class={twMerge("flex flex-col", props.class)}>
					<FormComp.Label>
						<Trans>Tag Type</Trans>
					</FormComp.Label>
					<Select.Root<"" | TagType>
						name={field.props.name}
						value={field.input ?? ""}
						onChange={(value) => {
							const next = value ?? ""
							field.onInput(next === "" ? undefined : next)
						}}
						options={TAG_TYPE_VALUE_OPTIONS}
						itemComponent={(itemProps) => (
							<Select.Item item={itemProps.item}>
								{itemProps.item.rawValue === ""
									? t`-- Please Select Type --`
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
						<Select.Trigger>
							<Select.Value<string>>
								{(state) => {
									const selectedOption = state.selectedOption()
									return selectedOption === ""
										? t`-- Please Select Type --`
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
