import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import type { JSX, ParentProps } from "solid-js"
import { Show } from "solid-js"

import { InputField } from "~/component/atomic/form/Input"
import { px } from "~/style/tokens.stylex"

import { authStyles } from "../styles"

const styles = stylex.create({ hint: { marginTop: px[8] } })

type FieldLayoutProps = ParentProps<{
	label: string
	error?: string
	hint?: JSX.Element
	styles?: StyleXStyles
}>

export function FieldLayout(props: FieldLayoutProps) {
	return (
		<InputField.Root styles={props.styles}>
			<InputField.Label styles={authStyles.fieldLabel}>
				{props.label}
			</InputField.Label>
			{props.children}
			<Show when={props.hint}>
				<div {...stylex.attrs(styles.hint)}>{props.hint}</div>
			</Show>
			<InputField.Error>{props.error}</InputField.Error>
		</InputField.Root>
	)
}
