import type { JSX } from "solid-js"
import { For } from "solid-js"

export function Intersperse<T>(props: {
	list: T[] | null | undefined
	separator?: JSX.Element
	children: (item: T, index: () => number) => JSX.Element
}) {
	const lastIdx = () => (props.list ? props.list.length - 1 : -1)
	return (
		<For each={props.list}>
			{(item, index) => (
				<>
					{props.children(item, index)}
					{lastIdx() != index() ? props.separator : <></>}
				</>
			)}
		</For>
	)
}
