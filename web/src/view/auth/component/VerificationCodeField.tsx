import type { FieldElementProps } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { JSX } from "solid-js"
import { createSignal } from "solid-js"

import { InputField } from "~/component/atomic/form/Input"
import { callHandlerUnion } from "~/utils/dom/event"

import { FieldLayout } from "./FieldLayout"

type VerificationCodeFieldStore = {
	errors: [string, ...string[]] | null
	input: string | undefined
	props: FieldElementProps
}

type VerificationCodeFieldProps = {
	field: VerificationCodeFieldStore
	class?: string
	onInput?: JSX.EventHandler<HTMLInputElement, InputEvent>
	onFocus?: JSX.EventHandler<HTMLInputElement, FocusEvent>
	onBlur?: JSX.EventHandler<HTMLInputElement, FocusEvent>
	hideError?: boolean
}

export function VerificationCodeField(props: VerificationCodeFieldProps) {
	const { t } = useLingui()
	const [isEditing, setIsEditing] = createSignal(false)

	return (
		<FieldLayout
			label={t`Verification code`}
			error={
				props.hideError || isEditing() ? undefined : props.field.errors?.[0]
			}
			class={props.class}
		>
			<InputField.Input
				{...props.field.props}
				class="h-9 w-full"
				type="text"
				inputMode="numeric"
				autocomplete="one-time-code"
				pattern="\\d*"
				maxLength={6}
				id="code"
				value={props.field.input ?? ""}
				onFocus={(e) => {
					setIsEditing(true)
					callHandlerUnion(e, props.field.props.onFocus)
					props.onFocus?.(e)
				}}
				onInput={(e) => {
					setIsEditing(true)
					const el = e.currentTarget
					const next = el.value.replaceAll(/\D/gu, "").slice(0, 6)
					if (el.value !== next) el.value = next
					callHandlerUnion(e, props.field.props.onInput)
					props.onInput?.(e)
				}}
				onBlur={(e) => {
					setIsEditing(false)
					callHandlerUnion(e, props.field.props.onBlur)
					props.onBlur?.(e)
				}}
			/>
		</FieldLayout>
	)
}
