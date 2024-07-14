import { type JSX, mergeProps, splitProps } from "solid-js"

export interface ButtonAttributes
	extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
	children?: string | JSX.Element
}

/**
 * @returns props that omit `children`, `class` and `type`
 */
export function splitButtonProps(props: ButtonAttributes) {
	const [, otherProps1] = splitProps(props, ["children", "class", "type"])
	const otherProps = mergeProps({ type: "button" as const }, otherProps1)
	return otherProps
}

export * as Button from "./buttons"
