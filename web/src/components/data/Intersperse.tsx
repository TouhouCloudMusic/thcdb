import type { JSX } from "solid-js"
import { For } from "solid-js"

export function Intersperse<T>(props: {
	of: T[] | null | undefined
	with?: JSX.Element
	fallback?: JSX.Element
	children: (item: T, index: () => number) => JSX.Element
}) {
	const lastIdx = () => (props.of ? props.of.length - 1 : -1)
	return (
		<For
			each={props.of}
			fallback={props.fallback}
		>
			{(item, index) => (
				<>
					{props.children(item, index)}
					{lastIdx() != index() && props.with}
				</>
			)}
		</For>
	)
}
