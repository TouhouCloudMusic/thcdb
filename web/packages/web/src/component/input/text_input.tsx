import { createMemo, splitProps, type JSX } from "solid-js"
import { twMerge } from "tailwind-merge"

export function TextInput(
	props: Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type">
) {
	// @tw
	const style = "rounded border border-gray-300 pl-2 h-8"

	const [, otherProps] = splitProps(props, ["class"])

	const twClass = createMemo(() => twMerge(style, props.class))

	return (
		<input
			type="text"
			class={twClass()}
			{...otherProps}
		/>
	)
}
