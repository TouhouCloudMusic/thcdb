import type { FieldElementProps } from "@formisch/solid"
import { t } from "@lingui/core/macro"
import type { JSX } from "solid-js"
import { createSignal } from "solid-js"

import { InputField } from "~/component/atomic/form/Input"
import { callHandlerUnion } from "~/utils/dom/event"

import { FieldLayout } from "./FieldLayout"

type EmailFieldStore = {
	errors: [string, ...string[]] | null
	input: string | undefined
	props: FieldElementProps
}

type EmailFieldProps = {
	field: EmailFieldStore
	class?: string
	disabled?: boolean
	onChange?: JSX.EventHandler<HTMLInputElement, Event>
	onKeyDown?: JSX.EventHandler<HTMLInputElement, KeyboardEvent>
}

export function EmailField(props: EmailFieldProps) {
	const [isEditing, setIsEditing] = createSignal(false)

	return (
		<FieldLayout
			label={t`Email`}
			error={isEditing() ? undefined : props.field.errors?.[0]}
			class={props.class}
		>
			<InputField.Input
				{...props.field.props}
				class="h-9 w-full"
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
