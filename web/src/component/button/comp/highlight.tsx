import { createMemo, splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"
import { ButtonAttributes } from ".."
interface HighlightButtonAttributes extends ButtonAttributes {}

const twClass = `
	rounded transition-all shadow-[var(--shadow-2)]
	text-main font-medium
	bg-gray-1000 hover:bg-gray-1000/85 active:bg-gray-1000/80
	dark:hover:bg-gray-1000/90 dark:active:bg-gray-1000/80
	`

export default function HighlightButton(props: HighlightButtonAttributes) {
	const [, otherProps] = splitProps(props, ["children", "class"])
	const className = createMemo(() => twMerge(twClass, props.class))
	return (
		<button
			{...otherProps}
			class={className()}>
			{props.children}
		</button>
	)
}
