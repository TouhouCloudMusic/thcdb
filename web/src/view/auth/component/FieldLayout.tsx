import type { JSX, ParentProps } from "solid-js"
import { Show } from "solid-js"

import { InputField } from "~/component/atomic/form/Input"

type FieldLayoutProps = ParentProps<{
	label: string
	error?: string
	hint?: JSX.Element
	class?: string
}>

export function FieldLayout(props: FieldLayoutProps) {
	return (
		<InputField.Root class={props.class}>
			<InputField.Label class="text-sm text-tertiary">
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
