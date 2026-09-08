import { Field } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import { For } from "solid-js"

import { InputField } from "~/component/atomic/form/Input"

import { useEventForm } from "../context"

const styles = stylex.create({
	field: { display: "flex", flexDirection: "column" },
})

type Props = {
	styles?: StyleXStyles
}

export function EventNameField(props: Props) {
	const { t } = useLingui()
	const { formStore } = useEventForm()

	return (
		<Field
			of={formStore}
			path={["data", "name"]}
		>
			{(field) => (
				<InputField.Root styles={[styles.field, props.styles]}>
					<InputField.Label>{t`Name`}</InputField.Label>
					<InputField.Input
						{...field.props}
						value={field.input ?? ""}
					/>
					<For each={field.errors}>
						{(error) => <InputField.Error>{error}</InputField.Error>}
					</For>
				</InputField.Root>
			)}
		</Field>
	)
}
