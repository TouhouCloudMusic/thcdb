import type { FieldElementProps } from "@formisch/solid"

import { InputField } from "~/component/atomic/form/Input"

import { FieldLayout } from "./FieldLayout"

type UsernameFieldStore = {
	errors: [string, ...string[]] | null
	input?: string
	props: FieldElementProps
}

type UsernameFieldProps = {
	field: UsernameFieldStore
	class?: string
}

export function UsernameField(props: UsernameFieldProps) {
	return (
		<FieldLayout
			label="Username"
			error={props.field.errors?.[0]}
			class={props.class}
		>
			<InputField.Input
				{...props.field.props}
				class="h-9 w-full"
				type="text"
				id="username"
				value={props.field.input ?? ""}
			/>
		</FieldLayout>
	)
}
