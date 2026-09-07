import { Field } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"

import { InputField } from "~/component/atomic/form/Input"
import { px } from "~/style/tokens.stylex"

import { useEventForm } from "../context"

const styles = stylex.create({
	field: { display: "flex", flexDirection: "column" },
	descriptionInput: { minHeight: px[128] },
})

type Props = {
	styles?: StyleXStyles
}

export function EventDescriptionField(props: Props) {
	const { t } = useLingui()
	const { formStore } = useEventForm()

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
						styles={styles.descriptionInput}
					/>
					<InputField.Error>
						{field.errors ? field.errors[0] : undefined}
					</InputField.Error>
				</InputField.Root>
			)}
		</Field>
	)
}
