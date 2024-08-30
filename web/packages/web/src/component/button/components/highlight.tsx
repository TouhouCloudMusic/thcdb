import { createMemo } from "solid-js"
import { twMerge } from "tailwind-merge"
import {
	baseButtonTwClass,
	type ButtonAttributes,
	splitButtonProps,
} from "./base"

interface HighlightButtonAttributes extends ButtonAttributes {}

const twClass = `
  shadow-[var(--shadow-2)]
	text-main
	bg-gray-1000 hover:bg-gray-1000/85 active:bg-gray-1000/80
	dark:hover:bg-gray-1000/90 dark:active:bg-gray-1000/80
	`

export default function HighlightButton(props: HighlightButtonAttributes) {
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
