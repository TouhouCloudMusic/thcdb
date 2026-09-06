import type { JSX, ParentProps } from "solid-js"
import { Show } from "solid-js"

import { InputField } from "~/component/atomic/form/Input"

import { AUTH_FIELD_LABEL_CLASS } from "../styles"

type FieldLayoutProps = ParentProps<{
	label: string
	error?: string
	hint?: JSX.Element
	class?: string
}>

export function FieldLayout(props: FieldLayoutProps) {
	return (
		<InputField.Root class={props.class}>
			<InputField.Label class={AUTH_FIELD_LABEL_CLASS}>
				{props.label}
			</InputField.Label>
			{props.children}
			<Show when={props.hint}>
				<div class="mt-2">{props.hint}</div>
			</Show>
			<InputField.Error>{props.error}</InputField.Error>
		</InputField.Root>
	)
}
