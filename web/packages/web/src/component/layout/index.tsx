import { createMemo, type JSX, splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"

export function VStack(props: JSX.HTMLAttributes<HTMLDivElement>) {
	const twClass = createMemo(() => twMerge(props.class, "flex flex-col"))

	const [, otherProps] = splitProps(props, ["class"])

	return (
		<div
			{...otherProps}
			class={twClass()}></div>
	)
}

export function HStack(props: JSX.HTMLAttributes<HTMLDivElement>) {
	const twClass = createMemo(() => twMerge(props.class, "flex flex-row"))

	const [, otherProps] = splitProps(props, ["class"])

	return (
		<div
			{...otherProps}
			class={twClass()}></div>
	)
}

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
