import type { ComponentProps } from "solid-js"
import { mergeProps } from "solid-js"
import { twMerge } from "tailwind-merge"

import { INPUT_CLASSNAME } from "../../Input"

type SelectProps = ComponentProps<"select">
function SelectImpl(props: SelectProps) {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(INPUT_CLASSNAME, "font-light px-1", props.class)
		},
	})

	return <select {...finalProps}></select>
}

type OptionProps = ComponentProps<"option">
function Option(props: OptionProps) {
	return <option {...props}></option>
}

export const Select = /*#__PURE__*/ Object.assign(SelectImpl, { Option })
