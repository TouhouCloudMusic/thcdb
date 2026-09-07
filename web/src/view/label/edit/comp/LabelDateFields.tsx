import { Field, setInput } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { For, createMemo } from "solid-js"

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
		{ key: "founded_date", label: t`Founded date` },
		{ key: "dissolved_date", label: t`Dissolved date` },
	]

	return (
		<For each={fields}>
			{(descriptor) => (
				<Field
					of={formStore}
					path={["data", descriptor.key]}
				>
					{(field) => {
						const currentValue = createMemo(() => {
							const input = field.input
							if (!input) return
							const { value, precision } = input
							if (!(value instanceof Date) || !precision) return
							return { value, precision }
						})

						return (
							<div {...stylex.attrs(styles.field, props.styles)}>
								<label {...stylex.attrs(formStyles.label, styles.label)}>
									{descriptor.label}
								</label>
								<DateWithPrecisionInput
									value={currentValue()}
									setValue={(value) =>
										setInput(formStore, {
											path: ["data", descriptor.key],
											// @ts-expect-error upstream formisch typing
											input: value,
										})
									}
								/>
								<For each={field.errors ?? []}>
									{(error) => (
										<FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>
									)}
								</For>
							</div>
						)
					}}
				</Field>
			)}
		</For>
	)
}
