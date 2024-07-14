import { createMemo } from "solid-js"
import { twMerge } from "tailwind-merge"
import { type ButtonAttributes, splitButtonProps } from ".."
import { baseButtonTwClass } from "./base"

const twClass = `
	shadow-[var(--shadow-2]
	text-white
	bg-red-800 hover:bg-red-700 active:bg-red-600
	`

export default function WarningButton(props: ButtonAttributes) {
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
