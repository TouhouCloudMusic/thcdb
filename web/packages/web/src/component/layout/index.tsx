import { createMemo, type JSX } from "solid-js"
import { twMerge } from "tailwind-merge"

export function Card(props: JSX.HTMLAttributes<HTMLDivElement>) {
	const twClass = createMemo(() =>
		twMerge("shadow-2 rounded bg-white p-2", props.class)
	)
	return (
		<div
			{...props}
			class={twClass()}></div>
	)
}
