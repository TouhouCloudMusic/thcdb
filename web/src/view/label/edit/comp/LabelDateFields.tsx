import { Field } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { For } from "solid-js"

import { FormComp } from "~/component/atomic/form"
import { DateWithPrecision as DateWithPrecisionInput } from "~/component/form/DateWithPrecision"
import { formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

import { useLabelForm } from "../context"

const styles = stylex.create({
	field: {
		display: "grid",
		gridTemplateColumns: "subgrid",
		rowGap: px[8],
	},
	label: { gridColumn: "1 / -1", margin: "0rem" },
})

type Props = {
	styles?: StyleXStyles
}

type DateFieldDescriptor = {
	key: "founded_date" | "dissolved_date"
	label: string
}

export function LabelDateFields(props: Props) {
	const { t } = useLingui()
	const { formStore } = useLabelForm()

	const fields: DateFieldDescriptor[] = [
		{
			key: "founded_date",
			get label() {
				return t`Founded date`
			},
		},
		{
			key: "dissolved_date",
			get label() {
				return t`Dissolved date`
			},
		},
	]

	return (
		<For each={fields}>
			{(descriptor) => (
				<Field
					of={formStore}
					path={["data", descriptor.key]}
				>
					{(field) => (
						<div {...stylex.attrs(styles.field, props.styles)}>
							<label {...stylex.attrs(formStyles.label, styles.label)}>
								{descriptor.label}
							</label>
							<DateWithPrecisionInput
								value={field.input}
								setValue={field.onInput}
							/>
							<For each={field.errors}>
								{(error) => (
									<FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>
								)}
							</For>
						</div>
					)}
				</Field>
			)}
		</For>
	)
}
