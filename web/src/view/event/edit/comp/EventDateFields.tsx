import { Field, setInput } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import { For, createMemo } from "solid-js"

import { FormComp } from "~/component/atomic/form"
import { DateWithPrecision as DateWithPrecisionInput } from "~/component/form/DateWithPrecision"
import { formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

import { useEventForm } from "../context"

const styles = stylex.create({
	dateField: {
		display: "grid",
		gridTemplateColumns: "subgrid",
		rowGap: px[8],
	},
	fieldLabel: { gridColumn: "1 / -1", margin: 0 },
})

type Props = {
	styles?: StyleXStyles
}

type DateFieldKey = "start_date" | "end_date"

type DateFieldDescriptor = {
	key: DateFieldKey
	label: string
}

export function EventDateFields(props: Props) {
	const { t } = useLingui()
	const { formStore } = useEventForm()

	const fields: DateFieldDescriptor[] = [
		{ key: "start_date", label: t`Start date` },
		{ key: "end_date", label: t`End date` },
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
							<div {...stylex.attrs(styles.dateField, props.styles)}>
								<label {...stylex.attrs(formStyles.label, styles.fieldLabel)}>
									{descriptor.label}
								</label>
								<DateWithPrecisionInput
									value={currentValue()}
									setValue={(value) =>
										setInput(formStore, {
											path: ["data", descriptor.key],
											// @ts-expect-error TODO: Upstream error formisch error
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
