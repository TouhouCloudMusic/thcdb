import type { FieldElementProps } from "@formisch/solid"
import { t } from "@lingui/core/macro"

import { InputField } from "~/component/atomic/form/Input"

import { FieldLayout } from "./FieldLayout"

type SignInIdentifierFieldStore = {
	errors: [string, ...string[]] | null
	input?: string
	props: FieldElementProps
}

type SignInIdentifierFieldProps = {
	field: SignInIdentifierFieldStore
	class?: string
}

export function SignInIdentifierField(props: SignInIdentifierFieldProps) {
	return (
		<FieldLayout
			label={t`Username / Email`}
			error={props.field.errors?.[0]}
			class={props.class}
		>
			<InputField.Input
				{...props.field.props}
				class="h-9 w-full"
				type="text"
				id="identifier"
				value={props.field.input ?? ""}
				placeholder={t`Enter your username or email`}
			/>
		</FieldLayout>
	)
}
