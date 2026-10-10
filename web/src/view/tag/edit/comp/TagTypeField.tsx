import { useField } from "@formisch/solid"
import { Trans, useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { TagType } from "@thc/api"

import { Select } from "~/component/atomic/form/select"
import { TAG_TYPES } from "~/domain/tag/constants"

import { useTagForm } from "../context"

type TagTypeOption = {
	value: TagType | undefined
	label: string
}

type Props = {
	styles?: StyleXStyles
}

export function TagFormTypeField(props: Props) {
	const { t } = useLingui()
	const { formStore } = useTagForm()

	const field = useField(formStore, { path: ["data", "type"] })

	const options = (): TagTypeOption[] => [
		{ value: undefined, label: t`-- Please Select Type --` },
		...TAG_TYPES.map((value) => ({ value, label: value })),
	]

	const selectedOption = () =>
		options().find((option) => option.value === field.input)

	const selectOption = (option: TagTypeOption | undefined) =>
		field.onInput(option?.value)

	return (
		<Select.Root
			value={selectedOption()}
			onChange={selectOption}
			fieldProps={field.props}
			errors={field.errors}
			options={options()}
			optionValue="label"
			optionTextValue="label"
			placeholder={t`-- Please Select Type --`}
			styles={props.styles}
		>
			<Select.Label>
				<Trans>Tag Type</Trans>
			</Select.Label>
			<Select.Trigger />
			<Select.Content />
			<Select.ErrorList />
		</Select.Root>
	)
}
