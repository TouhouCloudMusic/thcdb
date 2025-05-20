import type { FieldStore, FieldElementProps } from "@modular-forms/solid"
import type { ParentProps } from "solid-js"

import type { AuthSchema } from "~/api"
import { InputField } from "~/components/common/form/Input"

export function FieldLayout(
	props: ParentProps<{
		label: string
		for: string
		error?: string
	}>,
) {
	return (
		<InputField.Root>
			<InputField.Label class="text-sm text-slate-600">
				{props.label}
			</InputField.Label>
			{props.children}
			<InputField.Error message={props.error} />
		</InputField.Root>
	)
}

export function PasswordField<
	T extends "password" | "repeated_password",
>(props: {
	label: string
	field: T extends "password" ? FieldStore<AuthSchema.SignIn, T>
	:	FieldStore<AuthSchema.SignUp, T>
	props: FieldElementProps<AuthSchema.SignUp, T>
}) {
	return (
		<FieldLayout
			label={props.label}
			for={props.field.name}
			error={props.field.error}
		>
			<InputField.Input
				{...props.props}
				class="h-9"
				type="password"
				id={props.field.name}
			/>
		</FieldLayout>
	)
}

export function UserNameField(props: {
	field: FieldStore<AuthSchema.SignIn, "username">
	props: FieldElementProps<AuthSchema.SignIn, "username">
}) {
	return (
		<FieldLayout
			label="Username"
			for="username"
			error={props.field.error}
		>
			<InputField.Input
				{...props.props}
				class="h-9"
				type="text"
				id="username"
			/>
		</FieldLayout>
	)
}
