/* eslint-disable jsx-a11y/label-has-associated-control */
import { mergeProps, type ComponentProps } from "solid-js"
import { twMerge } from "tailwind-merge"

export type LabelProps = ComponentProps<"label">

// @tw
export const LABEL_CLASSNAME = "font-medium leading-6 mb-3 block"

export function Label(props: LabelProps) {
	const localProps = mergeProps(props, {
		get class() {
			return props.class ?
					twMerge(LABEL_CLASSNAME, props.class)
				:	LABEL_CLASSNAME
		},
	})

	return <label {...localProps}></label>
}
