import { type JSX, mergeProps, splitProps } from "solid-js"

export const baseButtonTwClass = `rounded transition-all font-medium`
export interface ButtonAttributes
	extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
	children?: string | JSX.Element
	isIcon?: boolean
}

/**
 * @returns props that omit `children`, `class` and `type`
 */
export function splitButtonProps(props: ButtonAttributes) {
	const [_, otherProps] = splitProps(props, ["children", "class"])
	return mergeProps({ type: "button" as const }, otherProps)
}
