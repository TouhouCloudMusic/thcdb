import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { ComponentProps, JSX } from "solid-js"
import { splitProps } from "solid-js"

import { Intersperse } from "../../data/Intersperse"
const styles = stylex.create({ list: { display: "flex", flexWrap: "wrap" } })
type ListProps<T> = {
	items: T[] | null | undefined
	separator?: string | JSX.Element
	children: (item: T, index: () => number) => JSX.Element
	styles?: StyleXStyles
} & Omit<ComponentProps<"ul">, "children" | "class">
export function List<T>(props: ListProps<T>) {
	const [local, rest] = splitProps(props, [
		"items",
		"separator",
		"children",
		"styles",
	])
	return (
		<ul
			{...rest}
			{...stylex.attrs(styles.list, local.styles)}
		>
			<Intersperse
				of={local.items}
				with={local.separator ?? <>,&nbsp;</>}
			>
				{local.children}
			</Intersperse>
		</ul>
	)
}
