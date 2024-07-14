import { createMemo } from "solid-js"
import { twMerge } from "tailwind-merge"
import { type ButtonAttributes, splitButtonProps } from ".."
import { baseButtonTwClass } from "./base"

const twClass = `
	text-gray-1000
	bg-main
	hover:bg-gray-200 active:bg-gray-300 disabled:!bg-gray-200
	dark:hover:bg-gray-200 dark:active:bg-gray-300
	`

export default function BorderlessButton(props: ButtonAttributes) {
	const otherProps = splitButtonProps(props)
	const className = createMemo(() =>
		twMerge(baseButtonTwClass, twClass, props.class)
	)
	return (
		<button
			{...otherProps}
			class={className()}>
			{props.children}
		</button>
	)
}
