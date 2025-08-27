import type { JSX } from "solid-js"
import { For } from "solid-js"

export function Intersperse<T>(props: {
	each: T[] | null | undefined
	separator?: JSX.Element
	fallback?: JSX.Element
	children: (item: T, index: () => number) => JSX.Element
}) {
	const lastIdx = () => (props.each ? props.each.length - 1 : -1)
	return (
		<For
			each={props.each}
			fallback={props.fallback}
		>
			{(item, index) => (
				<>
					{props.children(item, index)}
					{lastIdx() != index() ? props.separator : <></>}
				</>
			)}
		</For>
	)
}
