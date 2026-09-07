import type { FieldElementProps } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"

import { InputField } from "~/component/atomic/form/Input"

import { authStyles } from "../styles"
import { FieldLayout } from "./FieldLayout"

type SignInIdentifierFieldStore = {
	errors: [string, ...string[]] | null
	input?: string
	props: FieldElementProps
}

type SignInIdentifierFieldProps = {
	field: SignInIdentifierFieldStore
	styles?: StyleXStyles
}

export function SignInIdentifierField(props: SignInIdentifierFieldProps) {
	const { t } = useLingui()
	return (
		<FieldLayout
			label={t`Username / Email`}
			error={props.field.errors?.[0]}
			styles={props.styles}
		>
			<InputField.Input
				{...props.field.props}
				styles={authStyles.input}
				type="text"
				id="identifier"
				value={props.field.input ?? ""}
				placeholder={t`Enter your username or email`}
			/>
		</FieldLayout>
	)
}
