import { createMemo, type JSX, Show } from "solid-js"
import { twMerge } from "tailwind-merge"

export const Label = {
	// @tw
	className: `font-inter font-medium leading-6`,
}

export const Legend = {
	className: "font-inter text-base font-semibold leading-7 text-gray-900",
}

export const ErrorMessage = (
	props: Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children"> & {
		children?: string
	}
) => {
	const className = createMemo(() =>
		props.class ?
			twMerge(ErrorMessage.className, props.class)
		:	ErrorMessage.className
	)

	return (
		<Show when={props.children?.length}>
			<span
				{...props}
				class={className()}></span>
		</Show>
	)
}
ErrorMessage.className = "text-reimu-700 text-sm mt-2"

export const Input = {
	className: [
		// @tw
		"py-1.5 pl-3",
		// @tw
		"block border-0 bg-transparent rounded-md text-gray-900 placeholder:text-slate-400 sm:text-sm sm:leading-6 ",
	].join(" "),
}
