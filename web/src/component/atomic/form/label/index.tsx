/* eslint-disable jsx-a11y/label-has-associated-control */
import { mergeProps } from "solid-js"
import type { ComponentProps } from "solid-js"
import { twMerge } from "tailwind-merge"

export type LabelProps = ComponentProps<"label">

// @tw
export const LABEL_CLASSNAME = "font-light text-lg mb-2 block"

export function Label(props: LabelProps) {
	const localProps = mergeProps(props, {
		get class() {
			return twMerge(LABEL_CLASSNAME, props.class)
		},
	})

	return <label {...localProps}></label>
}
