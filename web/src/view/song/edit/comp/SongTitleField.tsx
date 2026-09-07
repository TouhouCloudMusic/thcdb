import { Field } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"

import { InputField } from "~/component/atomic/form/Input"
import { formStyles } from "~/style/primitives"

import type { SongFormStore } from "./types"

const styles = stylex.create({
	column: {
		display: "flex",
		flexDirection: "column",
	},
})

export function SongTitleField(props: {
	of: SongFormStore
	styles?: StyleXStyles
}) {
	const { t } = useLingui()
	return (
		<Field
			of={props.of}
			path={["data", "title"]}
		>
			{(field) => (
				<InputField.Root styles={[styles.column, props.styles]}>
					<label {...stylex.attrs(formStyles.label)}>{t`Title`}</label>
					<InputField.Input
						{...field.props}
						placeholder={t`Title`}
						value={field.input ?? undefined}
					/>
					<InputField.Error>
						{field.errors ? field.errors[0] : undefined}
					</InputField.Error>
				</InputField.Root>
			)}
		</Field>
	)
}
