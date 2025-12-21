import type { FieldStore, FieldElementProps } from "@modular-forms/solid"
import type { ParentProps } from "solid-js"

import { InputField } from "~/component/atomic/form/Input"
import type { SignIn, SignUp } from "~/domain/auth"

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
			<InputField.Error>{props.error}</InputField.Error>
		</InputField.Root>
	)
}

export function PasswordField<
	T extends "password" | "repeated_password",
>(props: {
	label: string
	field: T extends "password" ? FieldStore<SignIn, T> : FieldStore<SignUp, T>
	props: FieldElementProps<SignUp, T>
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
	field: FieldStore<SignIn, "username">
	props: FieldElementProps<SignIn, "username">
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
