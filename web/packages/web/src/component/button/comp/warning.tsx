import { createMemo, splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"
import { ButtonAttributes } from ".."

const twClass = `
	shadow-[var(--shadow-2] rounded transition-all
	text-white font-medium
	bg-red-800 hover:bg-red-700 active:bg-red-600
	`

export default function WarningButton(props: ButtonAttributes) {
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
