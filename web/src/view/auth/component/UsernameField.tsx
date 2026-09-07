import type { FieldElementProps } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"

import { InputField } from "~/component/atomic/form/Input"

import { authStyles } from "../styles"
import { FieldLayout } from "./FieldLayout"

type UsernameFieldStore = {
	errors: [string, ...string[]] | null
	input?: string
	props: FieldElementProps
}

type UsernameFieldProps = {
	field: UsernameFieldStore
	styles?: StyleXStyles
}

export function UsernameField(props: UsernameFieldProps) {
	const { t } = useLingui()
	return (
		<FieldLayout
			label={t`Username`}
			error={props.field.errors?.[0]}
			styles={props.styles}
		>
			<InputField.Input
				{...props.field.props}
				styles={authStyles.input}
				type="text"
				id="username"
				value={props.field.input ?? ""}
			/>
		</FieldLayout>
	)
}
