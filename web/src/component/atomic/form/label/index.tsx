import { splitProps } from "solid-js"
import type { ComponentProps, ParentProps } from "solid-js"
import { twMerge } from "tailwind-merge"

export type LabelProps = ParentProps<ComponentProps<"label">>

// @tw
export const LABEL_CLASSNAME = "font-light text-lg mb-2 block"

export function Label(props: LabelProps) {
	const [local, otherProps] = splitProps(props, ["class", "for", "children"])

	return (
		<label
			{...otherProps}
			for={local.for}
			class={twMerge(LABEL_CLASSNAME, local.class)}
		>
			{local.children}
		</label>
	)
}
