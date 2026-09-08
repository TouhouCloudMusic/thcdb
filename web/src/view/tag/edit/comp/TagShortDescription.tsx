import { Field } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import { For } from "solid-js"

import { InputField } from "~/component/atomic/form/Input"

import { useTagForm } from "../context"

const styles = stylex.create({
	field: { display: "flex", flexDirection: "column" },
})

type Props = {
	styles?: StyleXStyles
}

export function TagFormShortDescriptionField(props: Props) {
	const { t } = useLingui()
	const { formStore } = useTagForm()

	return (
		<Field
			of={formStore}
			path={["data", "short_description"]}
		>
			{(field) => (
				<InputField.Root styles={[styles.field, props.styles]}>
					<InputField.Label>{t`Short Description`}</InputField.Label>
					<InputField.Input
						{...field.props}
						value={field.input ?? ""}
						placeholder=""
					/>
					<For each={field.errors}>
						{(error) => <InputField.Error>{error}</InputField.Error>}
					</For>
				</InputField.Root>
			)}
		</Field>
	)
}
