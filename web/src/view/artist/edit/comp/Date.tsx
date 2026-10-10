import { Field } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import { For } from "solid-js"

import { FormComp } from "~/component/atomic/form"
import { DateWithPrecision } from "~/component/form/DateWithPrecision"
import { formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

import { useArtistForm } from "../context"

const styles = stylex.create({
	dateFields: {
		display: "flex",
		gap: px[16],
	},
})

type DateFieldKey = "start_date" | "end_date"

type DateFieldDescriptor = {
	key: DateFieldKey
	label: string
}

export function ArtistFormDateFields(props: { styles?: StyleXStyles }) {
	const { t } = useLingui()
	const { formStore } = useArtistForm()

	const fields: DateFieldDescriptor[] = [
		{
			key: "start_date",
			get label() {
				return t`Start date`
			},
		},
		{
			key: "end_date",
			get label() {
				return t`End date`
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
						<div {...stylex.attrs(props.styles)}>
							<label {...stylex.attrs(formStyles.label)}>
								{descriptor.label}
							</label>
							<div {...stylex.attrs(styles.dateFields)}>
								<DateWithPrecision
									value={field.input}
									setValue={field.onInput}
								/>
							</div>
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
