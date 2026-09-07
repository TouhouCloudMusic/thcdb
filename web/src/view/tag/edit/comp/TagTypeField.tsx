import { Field } from "@formisch/solid"
import { Trans, useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import type { TagType } from "@thc/api"
import { createUniqueId, For } from "solid-js"

import { FormComp, Select } from "~/component/atomic"
import { formStyles } from "~/style/primitives"

import { useTagForm } from "../context"

const styles = stylex.create({
	field: { display: "flex", flexDirection: "column" },
})

const TAG_TYPES: TagType[] = ["Descriptor", "Genre", "Movement", "Scene"]

const TAG_TYPE_VALUE_OPTIONS: ("" | TagType)[] = ["", ...TAG_TYPES]

type Props = {
	styles?: StyleXStyles
}

export function TagFormTypeField(props: Props) {
	const triggerId = createUniqueId()
	const { t } = useLingui()
	const { formStore } = useTagForm()

	return (
		<Field
			of={formStore}
			path={["data", "type"]}
		>
			{(field) => (
				<div {...stylex.attrs(styles.field, props.styles)}>
					<label
						for={triggerId}
						{...stylex.attrs(formStyles.label)}
					>
						<Trans>Tag Type</Trans>
					</label>
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
						<Select.Trigger id={triggerId}>
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
