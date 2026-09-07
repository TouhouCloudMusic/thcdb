import { Field } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"

import { InputField } from "~/component/atomic/form/Input"
import { px } from "~/style/tokens.stylex"

import { useArtistForm } from "../context"

const styles = stylex.create({
	field: {
		width: px[384],
	},
})

export function ArtistFormNameField(props: { styles?: StyleXStyles }) {
	const { t } = useLingui()
	const { formStore } = useArtistForm()

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
						type="text"
						id="name"
						value={field.input ?? ""}
					/>
					<InputField.Error>{field.errors?.[0]}</InputField.Error>
				</InputField.Root>
			)}
		</Field>
	)
}
