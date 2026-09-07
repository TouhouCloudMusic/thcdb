import { Field } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"

import { InputField } from "~/component/atomic/form/Input"

import { useTagForm } from "../context"

const styles = stylex.create({
	field: { display: "flex", flexDirection: "column" },
})

type Props = {
	styles?: StyleXStyles
}

export function TagFormDescriptionField(props: Props) {
	const { t } = useLingui()
	const { formStore } = useTagForm()

	return (
		<Field
			of={formStore}
			path={["data", "description"]}
		>
			{(field) => (
				<InputField.Root styles={[styles.field, props.styles]}>
					<InputField.Label>{t`Description`}</InputField.Label>
					<InputField.Textarea
						{...field.props}
						value={field.input ?? ""}
					/>
					<InputField.Error>
						{field.errors ? field.errors[0] : undefined}
					</InputField.Error>
				</InputField.Root>
			)}
		</Field>
	)
}
