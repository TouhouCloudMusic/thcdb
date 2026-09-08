import type { FieldElementProps } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { JSX } from "solid-js"
import { createSignal } from "solid-js"

import { InputField } from "~/component/atomic/form/Input"
import { callHandlerUnion } from "~/utils/dom/event"

import { authStyles } from "../styles"
import { FieldLayout } from "./FieldLayout"

type EmailFieldStore = {
	errors: [string, ...string[]] | null
	input: string | undefined
	props: FieldElementProps
}

type EmailFieldProps = {
	field: EmailFieldStore
	styles?: StyleXStyles
	disabled?: boolean
	onChange?: JSX.EventHandler<HTMLInputElement, Event>
	onKeyDown?: JSX.EventHandler<HTMLInputElement, KeyboardEvent>
}

export function EmailField(props: EmailFieldProps) {
	const { t } = useLingui()
	const [isEditing, setIsEditing] = createSignal(false)

	return (
		<FieldLayout
			label={t`Email`}
			error={isEditing() ? undefined : props.field.errors?.[0]}
			styles={props.styles}
		>
			<InputField.Input
				{...props.field.props}
				styles={authStyles.input}
				type="email"
				id="email"
				value={props.field.input ?? ""}
				disabled={props.disabled}
				onFocus={(e) => {
					setIsEditing(true)
					callHandlerUnion(e, props.field.props.onFocus)
				}}
				onChange={(e) => {
					setIsEditing(true)
					callHandlerUnion(e, props.field.props.onChange)
					props.onChange?.(e)
				}}
				onBlur={(e) => {
					setIsEditing(false)
					callHandlerUnion(e, props.field.props.onBlur)
				}}
				onKeyDown={(e) => {
					props.onKeyDown?.(e)
				}}
			/>
		</FieldLayout>
	)
}
