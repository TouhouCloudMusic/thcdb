import { createMemo, splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"
import { ButtonAttributes } from ".."

const twClass = `
	rounded transition-all
	text-gray-1000 font-medium
	bg-main
	hover:bg-gray-200 active:bg-gray-300 disabled:!bg-gray-200
	dark:hover:bg-gray-200 dark:active:bg-gray-300
	`

export default function BorderlessButton(props: ButtonAttributes) {
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
